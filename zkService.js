// ─── ZKTeco F22/ID Integration Service ───────────────────────────────────────
// Device: ZKTeco F22/ID at 10.16.15.141:4370
// Handles: 30s attendance poll, historical log pull, user sync
//
// This file is imported by server.js and runs as a background service.
// It writes directly to timelog.json using the same read/write helpers.
//
// KEY DESIGN NOTE:
// The ZKTeco F22/ID only allows ONE TCP connection at a time.
// The poll loop opens a connection, pulls logs, then disconnects.
// All other functions (getUsers, getStatus) open their own temporary connections.
// The _connecting semaphore prevents concurrent connect() races.

import ZKLib from 'node-zklib'

const DEVICE_IP   = '10.16.15.141'
const DEVICE_PORT = 4370
const TIMEOUT     = 5000   // ms — how long to wait for device to respond

// Injected from server.js so we use the same file I/O
let _readData  = null
let _writeData = null
let _zk        = null
let _connected = false

// ─── Internal helpers ─────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[ZK] ${new Date().toISOString().slice(11, 19)} ${msg}`)
}

// Persist an unmatched-ID event so the dashboard can surface it.
// Never throws — missing file is treated as an empty log.
function _logUnmatched(zkId, timestamp) {
  try {
    let existing = []
    try { existing = _readData('zk_unmatched.json') } catch { /* file not yet created */ }
    if (!Array.isArray(existing)) existing = []
    existing.push({ zkId, timestamp, detectedAt: new Date().toISOString(), deviceSerial: DEVICE_IP })
    _writeData('zk_unmatched.json', existing)
  } catch (err) {
    log(`_logUnmatched write error: ${err.message}`)
  }
}

// Match a ZK userId to an FMS employee via zkUserId field
function resolveEmployee(zkUserId) {
  const employees = _readData('employees.json')
  return employees.find(e => String(e.zkUserId) === String(zkUserId)) || null
}

// ZK sends 0=check-in, 1=check-out, 4=OT-in, 5=OT-out
// Even = in, odd = out
function zkTypeToFMS(zkState) {
  return (zkState % 2 === 0) ? 'in' : 'out'
}

function writePunch({ employeeId, name, dept, type, timestamp, zkUserId }) {
  const timelog = _readData('timelog.json')

  // Deduplicate — don't write the same punch twice (can happen on reconnect)
  const alreadyExists = timelog.some(e =>
    e.employeeId === employeeId &&
    e.timestamp  === timestamp  &&
    e.type       === type
  )
  if (alreadyExists) return null

  const entry = {
    id:        `TL${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    employeeId,
    name,
    dept,
    type,
    timestamp,
    source:    'biometric',
    zkUserId:  String(zkUserId)
  }
  timelog.push(entry)
  _writeData('timelog.json', timelog)
  log(`Punch saved: ${name} ${type} at ${timestamp}`)
  return entry
}

// ─── Connection management ────────────────────────────────────────────────────

let _connecting = false   // prevents concurrent connect() races

async function connect() {
  if (_connected) return true
  if (_connecting) {
    // Another call is mid-connect — wait up to 5s for it to finish
    const start = Date.now()
    await new Promise(resolve => {
      const poll = setInterval(() => {
        if (_connected || !_connecting || Date.now() - start > 5000) {
          clearInterval(poll)
          resolve()
        }
      }, 100)
    })
    return _connected
  }
  _connecting = true
  try {
    _zk = new ZKLib(DEVICE_IP, DEVICE_PORT, TIMEOUT, 4000)
    await _zk.createSocket(
      (err) => {
        log(`Socket error: ${err.message}`)
        _connected = false
      },
      () => {
        log('Device disconnected')
        _connected = false
      }
    )
    _connected = true
    log(`Connected to F22/ID at ${DEVICE_IP}:${DEVICE_PORT}`)
    return true
  } catch (err) {
    _connected = false
    log(`Connection failed: ${err.message}`)
    return false
  } finally {
    _connecting = false
  }
}

async function disconnect() {
  if (!_zk || !_connected) return
  try {
    await _zk.disconnect()
    _connected = false
    log('Disconnected cleanly')
  } catch { /* ignore */ }
}

// ─── Get device status ────────────────────────────────────────────────────────
// Reuses live listener socket — never opens a second connection

export async function getDeviceStatus() {
  try {
    if (_connected && _zk) {
      return { online: true, ip: DEVICE_IP, port: DEVICE_PORT, info: { ip: DEVICE_IP } }
    }
    const ok = await connect()
    if (!ok) return { online: false, ip: DEVICE_IP }
    const info = await _zk.getInfo()
    await disconnect()
    return { online: true, ip: DEVICE_IP, port: DEVICE_PORT, info }
  } catch (err) {
    return { online: false, ip: DEVICE_IP, error: err.message }
  }
}

// ─── Get users from device ────────────────────────────────────────────────────
// Returns the ZK user list for enrollment mapping.
// Reuses live listener socket if available.

export async function getDeviceUsers() {
  const usingLive = _connected && _zk
  let tempConnected = false

  try {
    if (!usingLive) {
      const ok = await connect()
      if (!ok) throw new Error(`Cannot reach device at ${DEVICE_IP}`)
      tempConnected = true
    }

    const { data: users } = await _zk.getUsers()
    log(`Got ${users.length} users from device`)
    return users  // [ { userId, name, role, ... }, ... ]

  } catch (err) {
    log(`getDeviceUsers error: ${err.message}`)
    throw new Error(`getDeviceUsers failed: ${err.message}`)
  } finally {
    // Only disconnect if we opened a temporary connection
    if (tempConnected) await disconnect()
  }
}

// ─── Pull historical attendance logs ─────────────────────────────────────────
// Downloads all stored punches from device, maps to employees, writes to timelog.
// Returns { imported, skipped, unmatched }
// Reuses live listener socket if available.

export async function pullHistoricalLogs({ since = null } = {}) {
  const usingLive = _connected && _zk
  let tempConnected = false

  let imported  = 0
  let skipped   = 0
  let unmatched = 0

  try {
    if (!usingLive) {
      const ok = await connect()
      if (!ok) throw new Error(`Cannot reach device at ${DEVICE_IP}`)
      tempConnected = true
    }

    if (tempConnected) await _zk.disableDevice()

    const { data: attendances } = await _zk.getAttendances()

    if (tempConnected) await _zk.enableDevice()

    log(`Device returned ${attendances.length} attendance records`)

    // Load once — avoids per-record file I/O
    const employees = _readData('employees.json')
    const timelog   = _readData('timelog.json')

    // O(1) dedup lookup keyed by employeeId|timestamp (type is computed, not a device field)
    const existing = new Set(
      timelog
        .filter(e => e.source === 'biometric')
        .map(e => `${e.employeeId}|${e.timestamp}`)
    )

    // Permanently blocked keys (same format: employeeId|timestamp)
    try {
      const blockedKeys = _readData('timelog_blocked.json')
      if (Array.isArray(blockedKeys)) blockedKeys.forEach(k => existing.add(k))
    } catch { /* file missing on first run */ }

    // Read configurable minimum import date from settings (biometricImportFrom: 'YYYY-MM-DD')
    let importFromTs = null
    try {
      const settings = _readData('settings.json')
      if (settings?.biometricImportFrom) {
        importFromTs = settings.biometricImportFrom + 'T00:00:00.000Z'
      }
    } catch { /* ignore */ }

    // Count existing biometric entries per employee+UTC-date — used for alternating offset
    const existsByEmpDate = {}
    for (const e of timelog) {
      if (e.source !== 'biometric') continue
      const k = `${e.employeeId}|${e.timestamp.slice(0, 10)}`
      existsByEmpDate[k] = (existsByEmpDate[k] || 0) + 1
    }

    const nowIso = new Date().toISOString()

    // ── Pass 1: collect new candidates grouped by employee+date ──────────────
    const candidatesByEmpDate = {}

    for (const record of attendances) {
      const timestamp = new Date(record.recordTime).toISOString()
      if (timestamp > nowIso)       { skipped++; continue }   // future date — bad RTC
      if (importFromTs && timestamp < importFromTs) { skipped++; continue }

      const emp = employees.find(e => String(e.zkUserId) === String(record.deviceUserId))
      if (!emp) {
        unmatched++
        const unmatchedTs = new Date(record.recordTime).toISOString()
        console.warn('[ZK] Unmatched employee ID', { zkId: String(record.deviceUserId), timestamp: unmatchedTs, deviceSerial: DEVICE_IP })
        _logUnmatched(String(record.deviceUserId), unmatchedTs)
        continue
      }

      const key = `${emp.id}|${timestamp}`
      if (existing.has(key)) { skipped++; continue }

      const dateKey  = timestamp.slice(0, 10)
      const groupKey = `${emp.id}|${dateKey}`
      if (!candidatesByEmpDate[groupKey]) {
        candidatesByEmpDate[groupKey] = { emp, dateKey, items: [] }
      }
      candidatesByEmpDate[groupKey].items.push({ timestamp, key, zkUserId: record.deviceUserId })
    }

    // ── Pass 2: assign alternating in/out by sequence position ────────────────
    const newEntries = []

    for (const { emp, dateKey, items } of Object.values(candidatesByEmpDate)) {
      items.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

      const groupKey = `${emp.id}|${dateKey}`
      const startIdx = existsByEmpDate[groupKey] || 0

      items.forEach(({ timestamp, key, zkUserId }, i) => {
        const type = (startIdx + i) % 2 === 0 ? 'in' : 'out'
        newEntries.push({
          id:         `TL${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          employeeId: emp.id,
          name:       emp.name,
          dept:       emp.dept,
          type,
          timestamp,
          source:     'biometric',
          zkUserId:   String(zkUserId)
        })
        existing.add(key)    // prevent within-batch dupes
        // update count so subsequent groups on the same day get the right offset
        existsByEmpDate[groupKey] = (existsByEmpDate[groupKey] || 0) + 1
        imported++
      })
    }

    if (newEntries.length > 0) {
      _writeData('timelog.json', [...timelog, ...newEntries])
    }

  } finally {
    if (tempConnected) await disconnect()
  }

  log(`Historical import done — imported: ${imported}, skipped: ${skipped}, unmatched: ${unmatched}`)
  return { imported, skipped, unmatched }
}

// ─── 30s Attendance Poll Loop ─────────────────────────────────────────────────
// F22/ID firmware does not push real-time events.
// Poll every 30s instead. writePunch() deduplication prevents double entries.

let _pollTimer  = null
let _pollActive = false
let _polling    = false   // prevents overlapping poll cycles
let _timeSynced = false   // sync device clock once on first poll

export function startPollLoop() {
  if (_pollActive) return
  _pollActive = true
  log('Attendance poll loop started (5min interval)')
  _schedulePoll()
}

function _schedulePoll() {
  if (!_pollActive) return
  _pollTimer = setTimeout(_runPoll, 300000)
}

function _latestBiometricTimestamp() {
  try {
    const timelog = _readData('timelog.json')
    const now = new Date().toISOString()
    let max = ''
    for (const e of timelog) {
      // Ignore future-dated entries — device RTC was wrong during earlier imports
      if (e.source === 'biometric' && e.timestamp > max && e.timestamp <= now) {
        max = e.timestamp
      }
    }
    return max || null
  } catch { return null }
}

async function _runPoll() {
  if (!_pollActive) return
  if (_polling) {
    log('Poll skipped — previous cycle still running')
    _schedulePoll()
    return
  }
  _polling = true
  try {
    if (!_timeSynced) {
      await syncDeviceTime()
      _timeSynced = true
    }
    const result = await pullHistoricalLogs()
    if (result.imported > 0) {
      log(`Poll: imported ${result.imported} new punch(es)`)
    }
  } catch (err) {
    log(`Poll error: ${err.message}`)
  } finally {
    _polling = false
    _schedulePoll()
  }
}

export function stopPollLoop() {
  _pollActive = false
  if (_pollTimer) { clearTimeout(_pollTimer); _pollTimer = null }
  log('Attendance poll loop stopped')
}

// Single poll cycle without scheduling — used by integration tests.
export async function runOnePollCycle() {
  if (_polling) return
  _polling = true
  try {
    if (!_timeSynced) {
      await syncDeviceTime()
      _timeSynced = true
    }
    const result = await pullHistoricalLogs()
    if (result.imported > 0) log(`Poll: imported ${result.imported} new punch(es)`)
    return result
  } catch (err) {
    log(`Poll error: ${err.message}`)
  } finally {
    _polling = false
  }
}

// ─── Sync device RTC to server clock ─────────────────────────────────────────
// CMD_SET_TIME (202) encodes local time as a packed uint32 using ZKTeco's formula.
// Called once automatically on the first poll cycle.

export async function syncDeviceTime() {
  let tempConnected = false
  try {
    if (!_connected) {
      const ok = await connect()
      if (!ok) { log('syncDeviceTime: device unreachable'); return }
      tempConnected = true
    }
    const now    = new Date()
    const year   = now.getFullYear() - 2000
    const month  = now.getMonth()        // 0-indexed
    const day    = now.getDate() - 1     // 0-indexed
    const hour   = now.getHours()
    const minute = now.getMinutes()
    const second = now.getSeconds()
    // Inverse of parseTimeToDate in node-zklib/utils.js
    const packed = ((year * 12 + month) * 31 + day) * 86400
                 + hour * 3600 + minute * 60 + second
    const buf = Buffer.alloc(4)
    buf.writeUInt32LE(packed, 0)
    await _zk.executeCmd(202, buf)   // 202 = CMD_SET_TIME
    log(`Device clock synced → ${now.toISOString()}`)
  } catch (err) {
    log(`syncDeviceTime error: ${err.message}`)
  } finally {
    if (tempConnected) await disconnect()
  }
}

// ─── Init — call this from server.js ─────────────────────────────────────────

export function initZKService(readData, writeData) {
  _readData  = readData
  _writeData = writeData
  log('ZK service initialised')
}

export function getZkInstance() {
  return { zk: _zk, connected: _connected }
}

// ─── Safe setUser — preserves fingerprint templates ──────────────────────────
// node-zklib setUser overwrites the device user record and does NOT restore
// fingerprint templates. Always use this wrapper instead of calling zk.setUser directly.

export async function safeSetUser(uid, userId, name, password, role, cardNo) {
  if (!_connected || !_zk) throw new Error('ZK not connected')

  // 1. Snapshot all templates, filter to this uid
  let userTemplates = []
  try {
    const { data: allTemplates } = await _zk.getTemplates()
    userTemplates = (allTemplates || []).filter(t => Number(t.uid) === Number(uid))
    if (userTemplates.length > 0) {
      log(`safeSetUser uid=${uid}: snapshotted ${userTemplates.length} template(s)`)
    }
  } catch (err) {
    log(`safeSetUser uid=${uid}: could not snapshot templates — ${err.message}`)
  }

  // 2. Write the user record
  await _zk.setUser(uid, userId, name, password, role, cardNo)
  log(`safeSetUser uid=${uid}: setUser complete`)

  // 3. Restore templates
  if (userTemplates.length > 0) {
    for (const tpl of userTemplates) {
      try {
        await _zk.setFingerprintTemplate(tpl)
      } catch (err) {
        log(`safeSetUser uid=${uid}: failed to restore template finger=${tpl.finger} — ${err.message}`)
      }
    }
    log(`safeSetUser uid=${uid}: restored ${userTemplates.length} template(s)`)
  }
}

// ─── Force-reset connection ───────────────────────────────────────────────────
// Clears any stuck socket state so the next API call opens a fresh connection.

export async function resetConnection() {
  _pollActive = false
  if (_pollTimer) { clearTimeout(_pollTimer); _pollTimer = null }
  if (_zk) {
    try { await _zk.disconnect() } catch { /* ignore errors on bad socket */ }
  }
  _zk = null
  _connected = false
  log('Connection reset — socket cleared')
  return { ok: true }
}
