// ─── ZKTeco F22/ID Integration Service ───────────────────────────────────────
// Device: ZKTeco F22/ID at 10.16.15.141:4370
// Handles: real-time punch events, historical log pull, user sync
//
// This file is imported by server.js and runs as a background service.
// It writes directly to timelog.json using the same read/write helpers.
//
// KEY DESIGN NOTE:
// The ZKTeco F22/ID only allows ONE TCP connection at a time.
// The live listener holds that connection permanently.
// All other functions (getUsers, pullLogs, getStatus) REUSE the live
// listener's open socket rather than opening a second connection.
// If the live listener is not running, they open a temporary connection.

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
  if (alreadyExists) {
    log(`Skipping duplicate punch for ${name} at ${timestamp}`)
    return null
  }

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

async function connect() {
  if (_connected) return true
  try {
    _zk = new ZKLib(DEVICE_IP, DEVICE_PORT, TIMEOUT, 4000)
    await _zk.createSocket(
      (err) => {
        log(`Socket error: ${err.message}`)
        _connected = false
        if (_liveActive) _reconnectTimer = setTimeout(_connectLive, 10000)
      },
      () => {
        log('Device disconnected')
        _connected = false
        if (_liveActive) _reconnectTimer = setTimeout(_connectLive, 10000)
      }
    )
    _connected = true
    log(`Connected to F22/ID at ${DEVICE_IP}:${DEVICE_PORT}`)
    return true
  } catch (err) {
    _connected = false
    log(`Connection failed: ${err.message}`)
    return false
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
      // Live listener is holding the connection — just report online
      return { online: true, ip: DEVICE_IP, port: DEVICE_PORT, info: { ip: DEVICE_IP } }
    }
    // Live listener not running — try a fresh temporary connection
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

export async function pullHistoricalLogs() {
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

    // Only disable/enable device if we have our own connection
    // (disabling while live listener is active would kill it)
    if (tempConnected) await _zk.disableDevice()

    const { data: attendances } = await _zk.getAttendances()

    if (tempConnected) await _zk.enableDevice()

    log(`Device returned ${attendances.length} attendance records`)

    // Log the first 5 records so we can verify raw attState values
    attendances.slice(0, 5).forEach(r => log(`RAW attState=${r.attState} inOutMode=${r.inOutMode} type=${r.type} deviceUserId=${r.deviceUserId}`))

    for (const record of attendances) {
      const emp = resolveEmployee(record.deviceUserId)
      if (!emp) {
        unmatched++
        continue
      }
      const type      = zkTypeToFMS(record.attState)
      const timestamp = new Date(record.recordTime).toISOString()
      const result    = writePunch({
        employeeId: emp.id,
        name:       emp.name,
        dept:       emp.dept,
        type,
        timestamp,
        zkUserId:   record.deviceUserId
      })
      result ? imported++ : skipped++
    }

  } finally {
    if (tempConnected) await disconnect()
  }

  log(`Historical import done — imported: ${imported}, skipped: ${skipped}, unmatched: ${unmatched}`)
  return { imported, skipped, unmatched }
}

// ─── Real-time live punch listener ───────────────────────────────────────────
// Stays connected and fires on every fingerprint scan.
// Auto-reconnects every 30s if device drops.

let _liveActive     = false
let _reconnectTimer = null

export async function startLiveListener() {
  if (_liveActive) return
  _liveActive = true
  log('Starting live punch listener...')
  await _connectLive()
}

async function _connectLive() {
  if (!_liveActive) return

  const ok = await connect()
  if (!ok) {
    log('Live listener: device unreachable, retrying in 30s...')
   _reconnectTimer = setTimeout(_connectLive, 30000)
    return
  }

  try {
    await _zk.getRealTimeLogs((data) => {
      log(`Raw punch event: ${JSON.stringify(data)}`)

      const rawId = data?.userId ?? data?.deviceUserId ?? data?.uid
      if (!rawId && rawId !== 0) {
        log(`Punch event missing userId — full data: ${JSON.stringify(data)}`)
        return
      }

      const emp = resolveEmployee(rawId)
      if (!emp) {
        log(`Unmatched ZK userId: ${rawId} — enroll this employee first`)
        return
      }

      const type      = zkTypeToFMS(data.attState ?? 0)
      const timestamp = new Date().toISOString()
      writePunch({
        employeeId: emp.id,
        name:       emp.name,
        dept:       emp.dept,
        type,
        timestamp,
        zkUserId:   String(rawId)
      })
    })

    // Diagnostic: log every raw TCP packet so we can see if the device is
    // sending anything at all, even if checkNotEventTCP filters it out.
    if (_zk.socket) {
      _zk.socket.on('data', (raw) => {
        log(`RAW TCP (${raw.length}b): ${raw.toString('hex').slice(0, 80)}`)
      })
    }

    log('Live listener active — waiting for punches...')
  } catch (err) {
    log(`Live listener error: ${err.message}, reconnecting in 30s...`)
    _connected = false
    _reconnectTimer = setTimeout(_connectLive, 30000)
  }
}

export function stopLiveListener() {
  _liveActive = false
  if (_reconnectTimer) clearTimeout(_reconnectTimer)
  disconnect()
  log('Live listener stopped')
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

// ─── Force-reset connection ───────────────────────────────────────────────────
// Clears any stuck socket state so the next API call opens a fresh connection.

export async function resetConnection() {
  _liveActive = false
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
  if (_zk) {
    try { await _zk.disconnect() } catch { /* ignore errors on bad socket */ }
  }
  _zk = null
  _connected = false
  log('Connection reset — socket cleared')
  return { ok: true }
}
