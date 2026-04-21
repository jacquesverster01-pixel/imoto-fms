import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { runAutoClockOut } from '../lib/autoClockOut.js'

// Build readData/writeData helpers that target a temp directory instead of data/.
function makeTempIo(dir) {
  return {
    readData(file) {
      const fp = path.join(dir, file)
      if (!fs.existsSync(fp)) throw new Error(`ENOENT: no such file, open '${fp}'`)
      return JSON.parse(fs.readFileSync(fp, 'utf-8'))
    },
    writeData(file, data) {
      fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2))
    },
  }
}

// Derive the SAST HH:MM string from a Date so the time-match check always fires.
function sastTimeOf(d) {
  const sast = new Date(d.getTime() + 2 * 3600 * 1000)
  return `${String(sast.getUTCHours()).padStart(2, '0')}:${String(sast.getUTCMinutes()).padStart(2, '0')}`
}

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aco-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('auto clock-out', () => {
  it('1a — clocks out employees whose last punch is "in", leaves clocked-out employee alone', () => {
    const now = new Date()
    const { readData, writeData } = makeTempIo(tmpDir)

    const threeHoursAgo = new Date(now.getTime() - 3 * 3600 * 1000).toISOString()
    const oneHourAgo    = new Date(now.getTime() - 1 * 3600 * 1000).toISOString()

    fs.writeFileSync(path.join(tmpDir, 'employees.json'), JSON.stringify([
      { id: 'E1', name: 'Alice', dept: 'Assembly' },
      { id: 'E2', name: 'Bob',   dept: 'Welding'  },
    ]))
    fs.writeFileSync(path.join(tmpDir, 'timelog.json'), JSON.stringify([
      { id: 'TL1', employeeId: 'E1', name: 'Alice', dept: 'Assembly', type: 'in',  timestamp: threeHoursAgo },
      { id: 'TL2', employeeId: 'E2', name: 'Bob',   dept: 'Welding',  type: 'in',  timestamp: threeHoursAgo },
      { id: 'TL3', employeeId: 'E2', name: 'Bob',   dept: 'Welding',  type: 'out', timestamp: oneHourAgo    },
    ]))
    fs.writeFileSync(path.join(tmpDir, 'settings.json'), JSON.stringify({
      autoClockOut: { enabled: true, time: sastTimeOf(now) },
    }))

    runAutoClockOut(readData, writeData, now)

    const timelog = readData('timelog.json')
    const aliceEntries = timelog.filter(e => e.employeeId === 'E1')
    const bobEntries   = timelog.filter(e => e.employeeId === 'E2')

    // Alice should now have an 'out' punch added
    expect(aliceEntries.length).toBe(2)
    expect(aliceEntries[aliceEntries.length - 1].type).toBe('out')
    expect(aliceEntries[aliceEntries.length - 1].source).toBe('auto')

    // Bob already clocked out — no new entries
    expect(bobEntries.length).toBe(2)
    expect(bobEntries.every(e => e.source !== 'auto')).toBe(true)
  })

  it('1b — all clocked out: writeData is never called', () => {
    const now = new Date()
    let writeCount = 0
    const { readData } = makeTempIo(tmpDir)
    const writeData = (file, data) => {
      fs.writeFileSync(path.join(tmpDir, file), JSON.stringify(data, null, 2))
      writeCount++
    }

    const oneHourAgo = new Date(now.getTime() - 1 * 3600 * 1000).toISOString()

    fs.writeFileSync(path.join(tmpDir, 'employees.json'), JSON.stringify([
      { id: 'E1', name: 'Alice', dept: 'Assembly' },
    ]))
    fs.writeFileSync(path.join(tmpDir, 'timelog.json'), JSON.stringify([
      { id: 'TL1', employeeId: 'E1', name: 'Alice', dept: 'Assembly', type: 'in',  timestamp: new Date(now.getTime() - 2 * 3600 * 1000).toISOString() },
      { id: 'TL2', employeeId: 'E1', name: 'Alice', dept: 'Assembly', type: 'out', timestamp: oneHourAgo },
    ]))
    fs.writeFileSync(path.join(tmpDir, 'settings.json'), JSON.stringify({
      autoClockOut: { enabled: true, time: sastTimeOf(now) },
    }))

    runAutoClockOut(readData, writeData, now)

    expect(writeCount).toBe(0)
  })

  it('1c — empty employee list does not throw', () => {
    const now = new Date()
    const { readData, writeData } = makeTempIo(tmpDir)

    fs.writeFileSync(path.join(tmpDir, 'employees.json'), JSON.stringify([]))
    fs.writeFileSync(path.join(tmpDir, 'timelog.json'),   JSON.stringify([]))
    fs.writeFileSync(path.join(tmpDir, 'settings.json'),  JSON.stringify({
      autoClockOut: { enabled: true, time: sastTimeOf(now) },
    }))

    expect(() => runAutoClockOut(readData, writeData, now)).not.toThrow()
  })

  it('1d — missing settings.json does not throw (uses error path, not crash)', () => {
    const now = new Date()
    const { readData, writeData } = makeTempIo(tmpDir)

    fs.writeFileSync(path.join(tmpDir, 'employees.json'), JSON.stringify([]))
    fs.writeFileSync(path.join(tmpDir, 'timelog.json'),   JSON.stringify([]))
    // Deliberately omit settings.json

    expect(() => runAutoClockOut(readData, writeData, now)).not.toThrow()
  })
})
