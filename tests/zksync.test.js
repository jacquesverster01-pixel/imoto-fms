// ZK sync tests use jest.unstable_mockModule which must be called at module level
// (top-level await, BEFORE the zkService import) so the mock is in place when
// zkService.js evaluates its own `import ZKLib from 'node-zklib'`.
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'os'
import fs from 'fs'
import path from 'path'

// ─── Mock ZKLib ───────────────────────────────────────────────────────────────
// We hold a reference to the mock constructor so individual tests can swap the
// implementation via ZKLibMock.mockImplementation().

const ZKLibMock = jest.fn()

await jest.unstable_mockModule('node-zklib', () => ({
  default: ZKLibMock,
}))

// Import zkService AFTER the mock is registered — module will see the mock ZKLib.
const {
  initZKService,
  pullHistoricalLogs,
  resetConnection,
  runOnePollCycle,
} = await import('../zkService.js')

// ─── Temp I/O helpers ─────────────────────────────────────────────────────────

function makeTempIo(dir) {
  return {
    readData(file) {
      const fp = path.join(dir, file)
      if (!fs.existsSync(fp)) throw new Error(`ENOENT: no such file '${file}'`)
      return JSON.parse(fs.readFileSync(fp, 'utf-8'))
    },
    writeData(file, data) {
      fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2))
    },
  }
}

// Default mock instance — createSocket resolves, getAttendances returns empty.
function makeDefaultZkInstance() {
  return {
    createSocket:  jest.fn().mockResolvedValue(undefined),
    getAttendances: jest.fn().mockResolvedValue({ data: [] }),
    disableDevice: jest.fn().mockResolvedValue(undefined),
    enableDevice:  jest.fn().mockResolvedValue(undefined),
    disconnect:    jest.fn().mockResolvedValue(undefined),
    executeCmd:    jest.fn().mockResolvedValue(undefined),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ZK sync', () => {
  let tmpDir

  beforeEach(async () => {
    // Fresh temp directory and default (working) mock for every test.
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zk-test-'))

    fs.writeFileSync(path.join(tmpDir, 'employees.json'),       JSON.stringify([]))
    fs.writeFileSync(path.join(tmpDir, 'timelog.json'),         JSON.stringify([]))
    fs.writeFileSync(path.join(tmpDir, 'timelog_blocked.json'), JSON.stringify([]))
    fs.writeFileSync(path.join(tmpDir, 'settings.json'),        JSON.stringify({}))

    const { readData, writeData } = makeTempIo(tmpDir)
    initZKService(readData, writeData)

    // Reset module-level connection state so each test starts clean.
    ZKLibMock.mockImplementation(makeDefaultZkInstance)
    await resetConnection()
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  // ─── 3a ───────────────────────────────────────────────────────────────────
  it('3a — connection timeout: runOnePollCycle resolves instead of throwing', async () => {
    // Override the mock so createSocket always rejects (simulates timeout).
    ZKLibMock.mockImplementation(() => ({
      ...makeDefaultZkInstance(),
      createSocket: jest.fn().mockRejectedValue(new Error('connect ETIMEDOUT 10.16.15.141:4370')),
    }))

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    try {
      const result = await runOnePollCycle()
      // Must resolve, not throw.
      expect(result).toBeUndefined()  // caught internally → returns undefined
      // The poll error should have been logged.
      const logged = logSpy.mock.calls.some(args =>
        String(args[0]).includes('Poll error') || String(args[0]).includes('Connection failed')
      )
      expect(logged).toBe(true)
    } finally {
      logSpy.mockRestore()
    }
  })

  // ─── 3b ───────────────────────────────────────────────────────────────────
  it('3b — valid punch from device is written with correct employee and timestamp', async () => {
    const zkUserId    = '42'
    const recordTime  = '2026-04-15T06:00:00.000Z'
    const expectedTs  = new Date(recordTime).toISOString()

    fs.writeFileSync(path.join(tmpDir, 'employees.json'), JSON.stringify([
      { id: 'E1', name: 'Test User', dept: 'Assembly', zkUserId },
    ]))

    ZKLibMock.mockImplementation(() => ({
      ...makeDefaultZkInstance(),
      getAttendances: jest.fn().mockResolvedValue({
        data: [{ deviceUserId: zkUserId, recordTime }],
      }),
    }))

    await pullHistoricalLogs()

    const { readData } = makeTempIo(tmpDir)
    const timelog = readData('timelog.json')

    expect(timelog).toHaveLength(1)
    expect(timelog[0].employeeId).toBe('E1')
    expect(timelog[0].name).toBe('Test User')
    expect(timelog[0].timestamp).toBe(expectedTs)
    expect(timelog[0].type).toBe('in')        // first punch of the day → 'in'
    expect(timelog[0].source).toBe('biometric')
    expect(timelog[0].zkUserId).toBe(String(zkUserId))
  })

  // ─── 3c ───────────────────────────────────────────────────────────────────
  it('3c — unknown device employee ID: does not crash, warns, and persists to zk_unmatched.json', async () => {
    // employees.json is empty — no matching zkUserId
    ZKLibMock.mockImplementation(() => ({
      ...makeDefaultZkInstance(),
      getAttendances: jest.fn().mockResolvedValue({
        data: [{ deviceUserId: '999', recordTime: '2026-04-15T06:00:00.000Z' }],
      }),
    }))

    const logSpy  = jest.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const result = await pullHistoricalLogs()

      // 1 — sync counts are correct
      expect(result.unmatched).toBe(1)
      expect(result.imported).toBe(0)

      // 2 — console.warn called with the structured object
      expect(warnSpy).toHaveBeenCalledWith(
        '[ZK] Unmatched employee ID',
        expect.objectContaining({ zkId: '999' })
      )

      // 3 — event persisted to zk_unmatched.json in the temp directory
      const { readData } = makeTempIo(tmpDir)
      const unmatched = readData('zk_unmatched.json')
      expect(unmatched).toHaveLength(1)
      expect(unmatched[0].zkId).toBe('999')
      expect(typeof unmatched[0].detectedAt).toBe('string')
      expect(unmatched[0].detectedAt.length).toBeGreaterThan(0)
    } finally {
      logSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })
})
