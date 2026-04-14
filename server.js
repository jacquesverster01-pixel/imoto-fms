import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { randomUUID } from 'crypto'
import { initZKService, pullHistoricalLogs, getDeviceUsers, getDeviceStatus, getZkInstance, resetConnection } from './zkService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001

// File uploads — stored in data/uploads/
const uploadsDir = path.join(__dirname, 'data', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
const upload = multer({ dest: uploadsDir })

// Data file initialisation — ensure all JSON files exist before routes run
const DATA_INITS = {
  'employees.json': [],
  'timelog.json':   [],
  'leave.json':     [],
  'excused.json':   [],
  'jobs.json':      [],
  'tools.json':     [],
  'stock.json':     [],
  'ohs_files.json': [],
}
for (const [file, empty] of Object.entries(DATA_INITS)) {
  const fp = path.join(__dirname, 'data', file)
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(empty))
}

app.use(cors())
app.use(express.json())

// Helper — read a JSON data file
function readData(file) {
  const filePath = path.join(__dirname, 'data', file)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (err) {
    throw new Error(`Failed to read ${file}: ${err.message}`)
  }
}

// Helper — write a JSON data file
function writeData(file, data) {
  const filePath = path.join(__dirname, 'data', file)
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (err) {
    throw new Error(`Failed to write ${file}: ${err.message}`)
  }
}

// Initialise ZKTeco service and start live fingerprint listener
initZKService(readData, writeData)
// startLiveListener() — disabled until device type mapping is fixed

// ─── AUTO CLOCK-OUT ──────────────────────────────────────
setInterval(() => {
  try {
    const settings = readData('settings.json')
    const aco = settings?.autoClockOut
    if (!aco?.enabled || !aco.time) return
    const now = new Date(Date.now() + 2 * 3600 * 1000) // SAST = UTC+2
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(now.getUTCMinutes()).padStart(2, '0')
    if (`${hh}:${mm}` !== aco.time) return
    const timelog = readData('timelog.json')
    const employees = readData('employees.json')?.employees || []
    // Find last event per employee — clock out anyone still 'in'
    const lastByEmp = {}
    for (const e of timelog) {
      if (!lastByEmp[e.employeeId] || new Date(e.timestamp) > new Date(lastByEmp[e.employeeId].timestamp)) {
        lastByEmp[e.employeeId] = e
      }
    }
    const toClockOut = Object.values(lastByEmp).filter(e => e.type === 'in')
    if (!toClockOut.length) return
    const nowIso = new Date().toISOString()
    for (const entry of toClockOut) {
      const emp = employees.find(e => e.id === entry.employeeId)
      timelog.push({
        id: `TL${Date.now()}_${entry.employeeId}`,
        employeeId: entry.employeeId,
        name: entry.name || emp?.name || entry.employeeId,
        dept: entry.dept || emp?.dept || '',
        type: 'out',
        source: 'auto',
        timestamp: nowIso,
      })
    }
    writeData('timelog.json', timelog)
    console.log(`[Auto clock-out] Clocked out ${toClockOut.length} employee(s) at ${aco.time}`)
  } catch (err) {
    console.error('[Auto clock-out] Error:', err.message)
  }
}, 60000)

// ─── EMPLOYEES ───────────────────────────────────────────
app.get('/api/employees', (req, res) => {
  try {
    const employees = readData('employees.json')
    res.json({ employees })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/employees', (req, res) => {
  try {
    const employees = readData('employees.json')
    const maxNum = employees.reduce((max, e) => {
      const n = parseInt((e.id || '').replace(/\D/g, ''), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    const newEmp = { ...req.body, id: `E${String(maxNum + 1).padStart(3, '0')}` }
    employees.push(newEmp)
    writeData('employees.json', employees)
    res.json(newEmp)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/employees/:id', (req, res) => {
  try {
    const employees = readData('employees.json')
    const idx = employees.findIndex(e => e.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Employee not found' })
    employees[idx] = { ...employees[idx], ...req.body }
    writeData('employees.json', employees)
    res.json(employees[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/employees/:id', (req, res) => {
  try {
    const employees = readData('employees.json')
    const idx = employees.findIndex(e => e.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Employee not found' })
    const removed = employees.splice(idx, 1)
    writeData('employees.json', employees)
    res.json(removed[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/employees/rename-dept', (req, res) => {
  try {
    const { from, to } = req.body
    if (!from || !to) return res.status(400).json({ error: 'from and to required' })
    const employees = readData('employees.json')
    employees.forEach(e => { if (e.dept === from) e.dept = to })
    writeData('employees.json', employees)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── TIMELOG ─────────────────────────────────────────────
app.get('/api/timelog', (req, res) => {
  try { res.json(readData('timelog.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/timelog', (req, res) => {
  try {
    const timelog = readData('timelog.json')
    const entry = {
      timestamp: new Date().toISOString(),
      ...req.body,
      id: `TL${Date.now()}`,
    }
    timelog.push(entry)
    writeData('timelog.json', timelog)
    res.json(entry)
  } catch (err) { res.status(500).json({ error: err.message }) }
})
app.put('/api/timelog/:id', (req, res) => {
  try {
    const timelog = readData('timelog.json')
    const idx = timelog.findIndex(e => e.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Entry not found' })
    timelog[idx] = { ...timelog[idx], ...req.body }
    writeData('timelog.json', timelog)
    res.json(timelog[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})
app.put('/api/timelog', (req, res) => {
  // Bulk update — accepts an array of { id, timestamp }
  try {
    const updates = req.body
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Expected an array' })
    const timelog = readData('timelog.json')
    updates.forEach(({ id, timestamp }) => {
      const idx = timelog.findIndex(e => e.id === id)
      if (idx !== -1) timelog[idx].timestamp = timestamp
    })
    writeData('timelog.json', timelog)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})
app.delete('/api/timelog/:id', (req, res) => {
  try {
    const timelog = readData('timelog.json')
    const idx = timelog.findIndex(e => e.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Entry not found' })
    const removed = timelog.splice(idx, 1)
    writeData('timelog.json', timelog)
    res.json(removed[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})
// ─── LEAVE ───────────────────────────────────────────────
app.get('/api/leave', (req, res) => {
  try { res.json(readData('leave.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/leave', (req, res) => {
  try {
    const leave = readData('leave.json')
    const entry = { ...req.body, id: `LV${Date.now()}`, createdAt: new Date().toISOString() }
    leave.push(entry)
    writeData('leave.json', leave)
    res.json(entry)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/leave/:id', (req, res) => {
  try {
    const leave = readData('leave.json')
    const idx = leave.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Leave record not found' })
    leave[idx] = { ...leave[idx], ...req.body }
    writeData('leave.json', leave)
    res.json(leave[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/leave/:id', (req, res) => {
  try {
    const leave = readData('leave.json')
    const idx = leave.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Leave record not found' })
    const removed = leave.splice(idx, 1)
    writeData('leave.json', leave)
    res.json(removed[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── EXCUSED ABSENCES ────────────────────────────────────
app.get('/api/excused', (_req, res) => {
  try { res.json(readData('excused.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/excused', (req, res) => {
  try {
    const { employeeId, date } = req.body
    if (!employeeId || !date) return res.status(400).json({ error: 'employeeId and date required' })
    const records = readData('excused.json')
    const exists = records.find(r => r.employeeId === employeeId && r.date === date)
    if (exists) return res.json(exists)
    const record = { id: `EX${Date.now()}`, employeeId, date }
    records.push(record)
    writeData('excused.json', records)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/excused/:id', (req, res) => {
  try {
    const records = readData('excused.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Record not found' })
    const removed = records.splice(idx, 1)
    writeData('excused.json', records)
    res.json(removed[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── EMPLOYEE DOCUMENT UPLOAD ────────────────────────────
// docType: cv | driversLicense | contract | teamInfoSheet
app.post('/api/employees/:id/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })
    const { docType } = req.body
    if (!docType) return res.status(400).json({ error: 'docType required' })
    const employees = readData('employees.json')
    const idx = employees.findIndex(e => e.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Employee not found' })
    if (!employees[idx].documents) employees[idx].documents = {}
    employees[idx].documents[docType] = { name: req.file.originalname, file: req.file.filename }
    writeData('employees.json', employees)
    res.json(employees[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── LEAVE DOCUMENT UPLOAD ───────────────────────────────
app.post('/api/leave/:id/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })
    const leave = readData('leave.json')
    const idx = leave.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Leave record not found' })
    if (!leave[idx].documents) leave[idx].documents = []
    leave[idx].documents.push({ name: req.file.originalname, file: req.file.filename })
    writeData('leave.json', leave)
    res.json(leave[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── DISCIPLINARY ────────────────────────────────────────
const discFile = path.join(__dirname, 'data', 'disciplinary.json')
if (!fs.existsSync(discFile)) fs.writeFileSync(discFile, '[]')

app.get('/api/disciplinary', (req, res) => {
  try { res.json(readData('disciplinary.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/disciplinary', (req, res) => {
  try {
    const records = readData('disciplinary.json')
    const record = { attachments: [], ...req.body, id: `DC${Date.now()}`, status: 'pending_document' }
    records.push(record)
    writeData('disciplinary.json', records)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/disciplinary/:id', (req, res) => {
  try {
    const records = readData('disciplinary.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Record not found' })
    records[idx] = { ...records[idx], ...req.body }
    writeData('disciplinary.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/disciplinary/:id', (req, res) => {
  try {
    const records = readData('disciplinary.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Record not found' })
    const removed = records.splice(idx, 1)
    writeData('disciplinary.json', records)
    res.json(removed[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/disciplinary/:id/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })
    const records = readData('disciplinary.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Record not found' })
    if (!records[idx].attachments) records[idx].attachments = []
    records[idx].attachments.push({ name: req.file.originalname, file: req.file.filename })
    records[idx].status = 'complete'
    writeData('disciplinary.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir))

// ─── JOBS ─────────────────────────────────────────────────
app.get('/api/jobs', (req, res) => {
  try { res.json(readData('jobs.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/jobs', (req, res) => {
  try {
    const jobs = readData('jobs.json')
    const newJob = { ...req.body, id: `J${String(jobs.length + 1).padStart(3, '0')}` }
    jobs.push(newJob)
    writeData('jobs.json', jobs)
    res.json(newJob)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/jobs/:id', (req, res) => {
  try {
    const jobs = readData('jobs.json')
    const idx = jobs.findIndex(j => j.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Job not found' })
    jobs[idx] = { ...jobs[idx], ...req.body }
    writeData('jobs.json', jobs)
    res.json(jobs[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/jobs/:id', (req, res) => {
  try {
    let jobs = readData('jobs.json')
    const exists = jobs.some(j => j.id === req.params.id)
    if (!exists) return res.status(404).json({ error: 'Job not found' })
    jobs = jobs.filter(j => j.id !== req.params.id)
    writeData('jobs.json', jobs)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── TOOLS ────────────────────────────────────────────────
app.get('/api/tools', (req, res) => {
  try { res.json(readData('tools.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/tools', (req, res) => {
  try {
    const tools = readData('tools.json')
    const newTool = { ...req.body, id: `T${String(tools.length + 1).padStart(3, '0')}` }
    tools.push(newTool)
    writeData('tools.json', tools)
    res.json(newTool)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/tools/:id', (req, res) => {
  try {
    const tools = readData('tools.json')
    const idx = tools.findIndex(t => t.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Tool not found' })
    tools[idx] = { ...tools[idx], ...req.body }
    writeData('tools.json', tools)
    res.json(tools[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/tools/:id', (req, res) => {
  try {
    let tools = readData('tools.json')
    tools = tools.filter(t => t.id !== req.params.id)
    writeData('tools.json', tools)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── STOCK ────────────────────────────────────────────────
app.get('/api/stock', (req, res) => {
  try { res.json(readData('stock.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/stock', (req, res) => {
  try {
    const stock = readData('stock.json')
    const newItem = { ...req.body, id: `S${String(stock.length + 1).padStart(3, '0')}` }
    stock.push(newItem)
    writeData('stock.json', stock)
    res.json(newItem)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/stock/:id', (req, res) => {
  try {
    const stock = readData('stock.json')
    const idx = stock.findIndex(s => s.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Stock item not found' })
    stock[idx] = { ...stock[idx], ...req.body }
    writeData('stock.json', stock)
    res.json(stock[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/stock/:id', (req, res) => {
  try {
    let stock = readData('stock.json')
    const exists = stock.some(s => s.id === req.params.id)
    if (!exists) return res.status(404).json({ error: 'Stock item not found' })
    stock = stock.filter(s => s.id !== req.params.id)
    writeData('stock.json', stock)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ZKTeco device status
app.get('/api/zk/status', async (req, res) => {
  try {
    const status = await getDeviceStatus()
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Pull all historical logs from device into timelog.json
// POST because it causes a side effect (writes data)
app.post('/api/zk/pull', async (req, res) => {
  try {
    const result = await pullHistoricalLogs()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get list of users enrolled on the device
app.get('/api/zk/users', async (req, res) => {
  try {
    const users = await getDeviceUsers()
    res.json({ users })          // ← wrap in object
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Link a ZK userId to an FMS employee
// Body: { employeeId: "E001", zkUserId: "3" }
// This writes zkUserId onto the employee record so punches can be matched
app.post('/api/zk/enroll', (req, res) => {
  try {
    const { employeeId, zkUserId } = req.body
    if (!employeeId || !zkUserId) {
      return res.status(400).json({ error: 'employeeId and zkUserId are required' })
    }
    const employees = readData('employees.json')
    const idx = employees.findIndex(e => e.id === employeeId)
    if (idx === -1) return res.status(404).json({ error: 'Employee not found' })
    employees[idx].zkUserId = String(zkUserId)
    writeData('employees.json', employees)
    res.json(employees[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Force-reset the ZK socket then immediately re-check device status
app.post('/api/zk/reconnect', async (req, res) => {
  try {
    await resetConnection()
    const status = await getDeviceStatus()
    res.json({ ok: true, ...status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── ADMIN PIN RESET (temporary diagnostic) ───────────────
app.post('/api/zk/reset-admin', async (req, res) => {
  const { zk, connected } = getZkInstance()

  if (!zk || !connected) {
    return res.status(503).json({ error: 'Live ZK socket not connected' })
  }

  // Log every method available on the _zk instance
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(zk))
  console.log('[ZK] Available methods:', methods)

  const results = { methods }

  // Try setUser to overwrite admin (uid 1, userId '0') with blank password
  if (typeof zk.setUser === 'function') {
    try {
      await zk.setUser(1, '0', '', '', 14, 0)  // uid, userId, name, password, role=14(admin), cardno
      results.setUser = 'called with blank password for uid=1 userId=0'
      console.log('[ZK] setUser(admin) called with blank password')
    } catch (err) {
      results.setUser = `error: ${err.message}`
      console.log('[ZK] setUser error:', err.message)
    }
  } else {
    results.setUser = 'method not available'
  }

  // Try any explicit admin/password clear methods if they exist
  for (const method of ['clearAdminPassword', 'setAdminPassword', 'clearPassword', 'deleteAdminUser']) {
    if (typeof zk[method] === 'function') {
      try {
        await zk[method]()
        results[method] = 'called successfully'
        console.log(`[ZK] ${method}() called`)
      } catch (err) {
        results[method] = `error: ${err.message}`
      }
    }
  }

  res.json(results)
})

// ─── SETTINGS ─────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  company: {
    name: 'iMoto Manufacturing (Pty) Ltd', reg: '2015/123456/07',
    address: 'Montague Gardens, Cape Town, 7441', phone: '+27 21 555 0100',
    email: 'info@imoto.co.za', website: 'www.imoto.co.za'
  },
  departments: [
    { name: 'Assembly', color: '#f59e0b' },
    { name: 'Cabinet Making', color: '#ef4444' },
    { name: 'Electrical', color: '#6c63ff' },
    { name: 'General', color: '#64748b' },
    { name: 'Plumbing', color: '#b45309' },
    { name: 'Welding', color: '#22c55e' },
    { name: 'Workshop', color: '#9298c4' }
  ],
  users: [
    { name: 'Jacques Du Plessis', email: 'jacques@imoto.co.za', role: 'Admin', color: '#6c63ff', id: 'JD' }
  ],
  alerts: {
    staffConstraint: true, toolOverdue: true, stockLevel: true,
    certExpiry: true, absentImpact: true, dailySummary: false
  },
  whatsapp: {
    enabled: false, twilioSid: '', twilioToken: '', number: '', checkinTime: '08:00',
    clockinReminders: false, leaveViaWhatsapp: false, sickNotePhoto: false,
    requireNoteMonFri: false, requireNoteAfter2: false
  }
}

app.get('/api/settings', (req, res) => {
  try {
    let settings
    try { settings = readData('settings.json') } catch { settings = DEFAULT_SETTINGS; writeData('settings.json', settings) }
    res.json(settings)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/settings', (req, res) => {
  try {
    let current
    try { current = readData('settings.json') } catch { current = { ...DEFAULT_SETTINGS } }
    const updated = { ...current, ...req.body }
    writeData('settings.json', updated)
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/settings/export', (req, res) => {
  try {
    let settingsData
    try { settingsData = readData('settings.json') } catch { settingsData = {} }
    res.json({
      employees: readData('employees.json'),
      timelog: readData('timelog.json'),
      leave: readData('leave.json'),
      jobs: readData('jobs.json'),
      tools: readData('tools.json'),
      stock: readData('stock.json'),
      settings: settingsData,
      exportedAt: new Date().toISOString()
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/settings/reset', (req, res) => {
  try {
    writeData('timelog.json', [])
    writeData('leave.json', [])
    writeData('jobs.json', [])
    writeData('tools.json', [])
    writeData('stock.json', [])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS ──────────────────────────────────────────────────
const ohsFile = path.join(__dirname, 'data', 'ohs.json')
if (!fs.existsSync(ohsFile)) fs.writeFileSync(ohsFile, '[]')

app.get('/api/ohs', (req, res) => {
  try { res.json(readData('ohs.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs', (req, res) => {
  try {
    const records = readData('ohs.json')
    const record = { correctiveActions: [], ...req.body, id: `OHS${Date.now()}`, status: req.body.status || 'Open', createdAt: new Date().toISOString() }
    records.push(record)
    writeData('ohs.json', records)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs/:id', (req, res) => {
  try {
    const records = readData('ohs.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
    records[idx] = { ...records[idx], ...req.body }
    writeData('ohs.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs/:id', (req, res) => {
  try {
    const records = readData('ohs.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
    const removed = records.splice(idx, 1)
    writeData('ohs.json', records)
    res.json(removed[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs/:id/action', (req, res) => {
  try {
    const records = readData('ohs.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
    if (!records[idx].correctiveActions) records[idx].correctiveActions = []
    const action = { ...req.body, id: `CA${Date.now()}`, status: req.body.status || 'Open' }
    records[idx].correctiveActions.push(action)
    writeData('ohs.json', records)
    res.json(action)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs/:id/action/:actionId', (req, res) => {
  try {
    const records = readData('ohs.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
    const actions = records[idx].correctiveActions || []
    const aIdx = actions.findIndex(a => a.id === req.params.actionId)
    if (aIdx === -1) return res.status(404).json({ error: 'Action not found' })
    actions[aIdx] = { ...actions[aIdx], ...req.body }
    records[idx].correctiveActions = actions
    writeData('ohs.json', records)
    res.json(actions[aIdx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs/:id/action/:actionId', (req, res) => {
  try {
    const records = readData('ohs.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
    const before = (records[idx].correctiveActions || []).length
    records[idx].correctiveActions = (records[idx].correctiveActions || []).filter(a => a.id !== req.params.actionId)
    if (records[idx].correctiveActions.length === before) return res.status(404).json({ error: 'Action not found' })
    writeData('ohs.json', records)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS TEMPLATES ────────────────────────────────────────
const ohsTemplatesFile = path.join(__dirname, 'data', 'ohs_templates.json')
if (!fs.existsSync(ohsTemplatesFile)) fs.writeFileSync(ohsTemplatesFile, '[]')

const ohsInspectionsFile = path.join(__dirname, 'data', 'ohs_inspections.json')
if (!fs.existsSync(ohsInspectionsFile)) fs.writeFileSync(ohsInspectionsFile, '[]')

app.get('/api/ohs-templates', (req, res) => {
  try { res.json(readData('ohs_templates.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-templates', (req, res) => {
  try {
    const templates = readData('ohs_templates.json')
    const template = { items: [], ...req.body, id: `TPL${Date.now()}` }
    templates.push(template)
    writeData('ohs_templates.json', templates)
    res.json(template)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-templates/:id', (req, res) => {
  try {
    const templates = readData('ohs_templates.json')
    const idx = templates.findIndex(t => t.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Template not found' })
    templates[idx] = { ...templates[idx], ...req.body }
    writeData('ohs_templates.json', templates)
    res.json(templates[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-templates/:id', (req, res) => {
  try {
    const templates = readData('ohs_templates.json')
    const idx = templates.findIndex(t => t.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Template not found' })
    const removed = templates.splice(idx, 1)
    writeData('ohs_templates.json', templates)
    res.json(removed[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS INSPECTIONS ──────────────────────────────────────
app.get('/api/ohs-inspections', (req, res) => {
  try { res.json(readData('ohs_inspections.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-inspections', (req, res) => {
  try {
    const { templateId, performedBy, department, location, scheduledDate } = req.body
    const templates = readData('ohs_templates.json')
    const template = templates.find(t => t.id === templateId)
    if (!template) return res.status(404).json({ error: 'Template not found' })
    const inspections = readData('ohs_inspections.json')
    const inspection = {
      id: `INS${Date.now()}`,
      templateId,
      templateName: template.name,
      performedBy: performedBy || '',
      department: department || template.department || '',
      location: location || '',
      scheduledDate: scheduledDate || new Date().toISOString().slice(0, 10),
      completedDate: null,
      status: 'Scheduled',
      score: null,
      maxScore: null,
      items: template.items.map(item => ({ ...item, result: null, notes: '' })),
      createdAt: new Date().toISOString()
    }
    inspections.push(inspection)
    writeData('ohs_inspections.json', inspections)
    res.json(inspection)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-inspections/:id', (req, res) => {
  try {
    const inspections = readData('ohs_inspections.json')
    const idx = inspections.findIndex(i => i.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Inspection not found' })
    inspections[idx] = { ...inspections[idx], ...req.body }
    const inspection = inspections[idx]
    if (req.body.status === 'Complete') {
      const scoreable = inspection.items.filter(i => i.result === 'Pass' || i.result === 'Fail')
      inspection.maxScore = scoreable.length
      inspection.score = scoreable.filter(i => i.result === 'Pass').length
      inspection.completedDate = new Date().toISOString().slice(0, 10)
      // Auto-create OHS incidents for each failed item
      const failedItems = inspection.items.filter(i => i.result === 'Fail')
      if (failedItems.length > 0) {
        const ohsRecords = readData('ohs.json')
        for (const item of failedItems) {
          ohsRecords.push({
            id: 'OHS' + Date.now() + Math.random().toString(36).slice(2, 6),
            type: 'Hazard',
            title: `Inspection failure: ${item.question.slice(0, 60)}`,
            description: `Failed during inspection "${inspection.templateName}" on ${inspection.completedDate}. Notes: ${item.notes || 'None'}`,
            reportedBy: inspection.performedBy,
            department: inspection.department,
            location: inspection.location,
            severity: 2,
            likelihood: 2,
            riskScore: 4,
            status: 'Open',
            date: inspection.completedDate,
            createdAt: new Date().toISOString(),
            correctiveActions: []
          })
        }
        writeData('ohs.json', ohsRecords)
      }
    }
    writeData('ohs_inspections.json', inspections)
    res.json(inspections[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-inspections/:id', (req, res) => {
  try {
    const inspections = readData('ohs_inspections.json')
    const idx = inspections.findIndex(i => i.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Inspection not found' })
    const removed = inspections.splice(idx, 1)
    writeData('ohs_inspections.json', inspections)
    res.json(removed[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS EQUIPMENT ────────────────────────────────────────
const OHS_EQUIPMENT_FILE     = path.join(__dirname, 'data', 'ohs_equipment.json')
const OHS_RISKS_FILE         = path.join(__dirname, 'data', 'ohs_risks.json')
const OHS_ZONES_FILE         = path.join(__dirname, 'data', 'ohs_zones.json')
const OHS_APPOINTMENTS_FILE  = path.join(__dirname, 'data', 'ohs_appointments.json')
const OHS_APPT_TYPES_FILE    = path.join(__dirname, 'data', 'ohs_appointment_types.json')

if (!fs.existsSync(OHS_EQUIPMENT_FILE)) fs.writeFileSync(OHS_EQUIPMENT_FILE, '[]')
if (!fs.existsSync(OHS_RISKS_FILE))     fs.writeFileSync(OHS_RISKS_FILE, '[]')
if (!fs.existsSync(OHS_ZONES_FILE)) {
  fs.writeFileSync(OHS_ZONES_FILE, JSON.stringify({ canvasWidth: 900, canvasHeight: 600, zones: [] }))
}
const OHS_INS_TEMPLATES_FILE = path.join(__dirname, 'data', 'ohs_inspection_templates.json')
const OHS_INS_ACTIVE_FILE    = path.join(__dirname, 'data', 'ohs_inspections_active.json')

if (!fs.existsSync(OHS_APPOINTMENTS_FILE)) fs.writeFileSync(OHS_APPOINTMENTS_FILE, '[]')
if (!fs.existsSync(OHS_INS_ACTIVE_FILE))   fs.writeFileSync(OHS_INS_ACTIVE_FILE, '[]')
if (!fs.existsSync(OHS_INS_TEMPLATES_FILE)) {
  const defaultTemplates = [
    { id:'WQ1', cadence:'weekly',    text:'Emergency exits clear and unobstructed',                          requiresPhoto:false, active:true },
    { id:'WQ2', cadence:'weekly',    text:'Fire extinguishers visible and unobstructed',                     requiresPhoto:false, active:true },
    { id:'WQ3', cadence:'weekly',    text:'First aid kit accessible and sealed',                             requiresPhoto:false, active:true },
    { id:'WQ4', cadence:'weekly',    text:'Housekeeping — aisles and workstations clear',                    requiresPhoto:false, active:true },
    { id:'WQ5', cadence:'weekly',    text:'PPE available and in good condition',                             requiresPhoto:false, active:true },
    { id:'WQ6', cadence:'weekly',    text:'No visible electrical hazards (exposed wires, overloaded sockets)',requiresPhoto:false, active:true },
    { id:'WQ7', cadence:'weekly',    text:'Spill kits in place and stocked',                                requiresPhoto:false, active:true },
    { id:'WQ8', cadence:'weekly',    text:'Safety signage visible and legible',                             requiresPhoto:false, active:true },
    { id:'MQ1', cadence:'monthly',   text:'Fire extinguisher pressure gauges checked',                       requiresPhoto:false, active:true },
    { id:'MQ2', cadence:'monthly',   text:'First aid kit contents checked and restocked if needed',          requiresPhoto:false, active:true },
    { id:'MQ3', cadence:'monthly',   text:'Emergency lighting tested',                                       requiresPhoto:false, active:true },
    { id:'MQ4', cadence:'monthly',   text:'Machinery guards in place and secure',                            requiresPhoto:false, active:true },
    { id:'MQ5', cadence:'monthly',   text:'Chemical storage — containers labelled and sealed',               requiresPhoto:false, active:true },
    { id:'MQ6', cadence:'monthly',   text:'Incident register reviewed',                                      requiresPhoto:false, active:true },
    { id:'MQ7', cadence:'monthly',   text:'PPE inspection — replace damaged items',                          requiresPhoto:false, active:true },
    { id:'MQ8', cadence:'monthly',   text:'Housekeeping audit of storage areas',                             requiresPhoto:false, active:true },
    { id:'QQ1', cadence:'quarterly', text:'Full fire equipment service check',                               requiresPhoto:false, active:true },
    { id:'QQ2', cadence:'quarterly', text:'Emergency evacuation drill conducted',                            requiresPhoto:false, active:true },
    { id:'QQ3', cadence:'quarterly', text:'OHS legal appointments reviewed and up to date',                  requiresPhoto:false, active:true },
    { id:'QQ4', cadence:'quarterly', text:'Risk register reviewed',                                          requiresPhoto:false, active:true },
    { id:'QQ5', cadence:'quarterly', text:'SHE rep consultation meeting held',                               requiresPhoto:false, active:true },
    { id:'QQ6', cadence:'quarterly', text:'Employee OHS training records reviewed',                          requiresPhoto:false, active:true },
    { id:'QQ7', cadence:'quarterly', text:'Noise and dust levels assessed',                                  requiresPhoto:false, active:true },
    { id:'QQ8', cadence:'quarterly', text:'First aid training currency checked',                             requiresPhoto:false, active:true },
  ]
  fs.writeFileSync(OHS_INS_TEMPLATES_FILE, JSON.stringify(defaultTemplates, null, 2))
}
if (!fs.existsSync(OHS_APPT_TYPES_FILE)) {
  fs.writeFileSync(OHS_APPT_TYPES_FILE, JSON.stringify([
    { id: 'AT1', label: 'SHE Representative',          legalRef: 'OHS Act Section 17' },
    { id: 'AT2', label: 'First Aider',                 legalRef: 'OHS Act General Safety Reg 3' },
    { id: 'AT3', label: 'Fire Fighter',                legalRef: 'OHS Act Section 26' },
    { id: 'AT4', label: 'Safety Officer',              legalRef: 'OHS Act Section 16(2)' },
    { id: 'AT5', label: 'Incident Investigator',       legalRef: 'OHS Act Section 24' },
    { id: 'AT6', label: 'Emergency Coordinator',       legalRef: 'OHS Act Section 26' },
    { id: 'AT7', label: 'Hazardous Chemical Handler',  legalRef: 'HCS Reg 4' },
    { id: 'AT8', label: 'Stacking & Storage Supervisor', legalRef: 'OHS Act GSR 8' },
  ]))
}

app.get('/api/ohs-equipment', (req, res) => {
  try { res.json(readData('ohs_equipment.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-equipment', (req, res) => {
  try {
    const records = readData('ohs_equipment.json')
    const record = { ...req.body, id: `EQ${Date.now()}`, createdAt: new Date().toISOString() }
    records.push(record)
    writeData('ohs_equipment.json', records)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-equipment/:id', (req, res) => {
  try {
    const records = readData('ohs_equipment.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Equipment not found' })
    records[idx] = { ...records[idx], ...req.body }
    writeData('ohs_equipment.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-equipment/:id', (req, res) => {
  try {
    let records = readData('ohs_equipment.json')
    records = records.filter(r => r.id !== req.params.id)
    writeData('ohs_equipment.json', records)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-equipment/:id/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })
    const records = readData('ohs_equipment.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Equipment not found' })
    records[idx].serviceStickerPhoto = { name: req.file.originalname, file: req.file.filename }
    writeData('ohs_equipment.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/ohs-equipment/:id/service-history', (req, res) => {
  try {
    const records = readData('ohs_equipment.json')
    const item = records.find(r => r.id === req.params.id)
    if (!item) return res.status(404).json({ error: 'Equipment not found' })
    res.json(item.serviceHistory || [])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-equipment/:id/service-history', (req, res) => {
  try {
    const records = readData('ohs_equipment.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Equipment not found' })
    if (!records[idx].serviceHistory) records[idx].serviceHistory = []
    const entry = { ...req.body, id: `SH${Date.now()}`, date: new Date().toISOString() }
    records[idx].serviceHistory.push(entry)
    if (req.body.nextServiceDate) records[idx].nextServiceDate = req.body.nextServiceDate
    writeData('ohs_equipment.json', records)
    res.json(entry)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS RISK REGISTER ────────────────────────────────────

function riskRatingFromScore(score) {
  if (score >= 13) return 'Critical'
  if (score >= 7)  return 'High'
  if (score >= 4)  return 'Medium'
  return 'Low'
}

function calcRiskFields(body) {
  const rec = { ...body }
  rec.riskScore     = (rec.likelihood || 1) * (rec.severity || 1)
  rec.riskRating    = riskRatingFromScore(rec.riskScore)
  rec.residualScore = (rec.residualLikelihood || 1) * (rec.residualSeverity || 1)
  rec.residualRating = riskRatingFromScore(rec.residualScore)
  return rec
}

app.get('/api/ohs-risks', (req, res) => {
  try { res.json(readData('ohs_risks.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-risks', (req, res) => {
  try {
    const records = readData('ohs_risks.json')
    const record = { ...calcRiskFields(req.body), id: `RSK${Date.now()}`, createdAt: new Date().toISOString() }
    records.push(record)
    writeData('ohs_risks.json', records)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-risks/:id', (req, res) => {
  try {
    const records = readData('ohs_risks.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Risk not found' })
    records[idx] = { ...records[idx], ...calcRiskFields(req.body) }
    writeData('ohs_risks.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-risks/:id', (req, res) => {
  try {
    let records = readData('ohs_risks.json')
    records = records.filter(r => r.id !== req.params.id)
    writeData('ohs_risks.json', records)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/ohs-risks/review-status', (req, res) => {
  try {
    const records = readData('ohs_risks.json')
    const today = new Date().toISOString().slice(0, 10)
    const result = records.map(r => {
      let status = r.reviewStatus || 'due'
      if (r.nextReviewDate && r.nextReviewDate < today) status = 'overdue'
      return {
        id: r.id,
        title: r.title,
        reviewStatus: status,
        lastReviewDate: r.lastReviewDate || null,
        nextReviewDate: r.nextReviewDate || null,
        reviewIntervalDays: r.reviewIntervalDays || 90,
      }
    })
    res.json(result)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-risks/:id/review', (req, res) => {
  try {
    const records = readData('ohs_risks.json')
    const { author, note, reviewedItems = [] } = req.body
    const today = new Date().toISOString().slice(0, 10)

    reviewedItems.forEach(item => {
      const idx = records.findIndex(r => r.id === item.id)
      if (idx !== -1) {
        const r = records[idx]
        const likelihood = Number(item.newLikelihood) || r.likelihood
        const severity   = Number(item.newSeverity)   || r.severity
        records[idx] = {
          ...r,
          likelihood,
          severity,
          riskScore: likelihood * severity,
          riskRating: riskRatingFromScore(likelihood * severity),
        }
      }
    })

    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Risk not found' })

    const risk = records[idx]
    const interval = risk.reviewIntervalDays || 90
    const nextD = new Date(today + 'T00:00:00Z')
    nextD.setUTCDate(nextD.getUTCDate() + interval)
    const nextReviewDate = nextD.toISOString().slice(0, 10)

    records[idx] = {
      ...records[idx],
      lastReviewDate: today,
      nextReviewDate,
      reviewStatus: 'ok',
      reviewNotes: [...(risk.reviewNotes || []), {
        id: `RN${Date.now()}`,
        date: today,
        author: author || '',
        note: note || '',
      }],
    }

    writeData('ohs_risks.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS ZONES ────────────────────────────────────────────

app.get('/api/ohs-zones', (req, res) => {
  try { res.json(readData('ohs_zones.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-zones', (req, res) => {
  try {
    writeData('ohs_zones.json', req.body)
    res.json(req.body)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS FILES ────────────────────────────────────────────

const OHS_FILE_ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

app.post('/api/ohs-files/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })
    if (!OHS_FILE_ALLOWED.has(req.file.mimetype)) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'File type not allowed' })
    }
    const { context, contextId, uploadedBy, label } = req.body
    const ext = path.extname(req.file.originalname)
    const storedName = `${randomUUID()}${ext}`
    const destPath = path.join(uploadsDir, storedName)
    fs.renameSync(req.file.path, destPath)
    const record = {
      id: `OHF${Date.now()}`,
      context: context || 'library',
      contextId: contextId || null,
      filename: storedName,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploadedBy || '',
      label: label || '',
    }
    const records = readData('ohs_files.json')
    records.push(record)
    writeData('ohs_files.json', records)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/ohs-files', (req, res) => {
  try {
    const { context, contextId } = req.query
    let records = readData('ohs_files.json')
    if (context) records = records.filter(r => r.context === context)
    if (contextId !== undefined) {
      records = records.filter(r => contextId ? r.contextId === contextId : !r.contextId)
    }
    res.json(records)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-files/:id', (req, res) => {
  try {
    let records = readData('ohs_files.json')
    const record = records.find(r => r.id === req.params.id)
    if (!record) return res.status(404).json({ error: 'File not found' })
    const filePath = path.join(uploadsDir, record.filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    records = records.filter(r => r.id !== req.params.id)
    writeData('ohs_files.json', records)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS LAW REFERENCE ────────────────────────────────────

app.get('/api/ohs-law-reference', (req, res) => {
  try { res.json(readData('ohs_law_reference.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS APPOINTMENTS ─────────────────────────────────────
app.get('/api/ohs-appointments', (_req, res) => {
  try { res.json(readData('ohs_appointments.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-appointments', (req, res) => {
  try {
    const records = readData('ohs_appointments.json')
    const record = { ...req.body, id: `APT${Date.now()}`, createdAt: new Date().toISOString() }
    records.push(record)
    writeData('ohs_appointments.json', records)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-appointments/:id', (req, res) => {
  try {
    const records = readData('ohs_appointments.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Appointment not found' })
    records[idx] = { ...records[idx], ...req.body }
    writeData('ohs_appointments.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-appointments/:id', (req, res) => {
  try {
    let records = readData('ohs_appointments.json')
    records = records.filter(r => r.id !== req.params.id)
    writeData('ohs_appointments.json', records)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-appointments/:id/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })
    const records = readData('ohs_appointments.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Appointment not found' })
    records[idx].certificate = { name: req.file.originalname, file: req.file.filename }
    writeData('ohs_appointments.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS APPOINTMENT TYPES ────────────────────────────────
app.get('/api/ohs-appointment-types', (_req, res) => {
  try { res.json(readData('ohs_appointment_types.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-appointment-types', (req, res) => {
  try {
    const records = readData('ohs_appointment_types.json')
    const record = { ...req.body, id: `AT${Date.now()}` }
    records.push(record)
    writeData('ohs_appointment_types.json', records)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-appointment-types/:id', (req, res) => {
  try {
    const records = readData('ohs_appointment_types.json')
    const idx = records.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Appointment type not found' })
    records[idx] = { ...records[idx], ...req.body }
    writeData('ohs_appointment_types.json', records)
    res.json(records[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-appointment-types/:id', (req, res) => {
  try {
    let records = readData('ohs_appointment_types.json')
    records = records.filter(r => r.id !== req.params.id)
    writeData('ohs_appointment_types.json', records)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS INSPECTION TEMPLATES ────────────────────────────

function getLocalIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return 'localhost'
}

app.get('/api/ohs-inspection-templates', (_req, res) => {
  try {
    const all = readData('ohs_inspection_templates.json')
    res.json({
      weekly:    all.filter(t => t.cadence === 'weekly'),
      monthly:   all.filter(t => t.cadence === 'monthly'),
      quarterly: all.filter(t => t.cadence === 'quarterly'),
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-inspection-templates', (req, res) => {
  try {
    const all    = readData('ohs_inspection_templates.json')
    const prefix = req.body.cadence === 'weekly' ? 'WQ' : req.body.cadence === 'monthly' ? 'MQ' : 'QQ'
    const record = { active: true, requiresPhoto: false, ...req.body, id: `${prefix}${Date.now()}` }
    all.push(record)
    writeData('ohs_inspection_templates.json', all)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-inspection-templates/:id', (req, res) => {
  try {
    const all = readData('ohs_inspection_templates.json')
    const idx = all.findIndex(t => t.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Template question not found' })
    all[idx] = { ...all[idx], ...req.body }
    writeData('ohs_inspection_templates.json', all)
    res.json(all[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-inspection-templates/:id', (req, res) => {
  try {
    let all = readData('ohs_inspection_templates.json')
    all = all.filter(t => t.id !== req.params.id)
    writeData('ohs_inspection_templates.json', all)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── OHS INSPECTION RUNS (ACTIVE) ─────────────────────────

app.get('/api/ohs-inspections-active', (_req, res) => {
  try { res.json(readData('ohs_inspections_active.json')) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/ohs-inspections-active/:id', (req, res) => {
  try {
    const all = readData('ohs_inspections_active.json')
    const ins = all.find(r => r.id === req.params.id)
    if (!ins) return res.status(404).json({ error: 'Inspection not found' })
    res.json(ins)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-inspections-active', (req, res) => {
  try {
    const all    = readData('ohs_inspections_active.json')
    const record = { status: 'pending', ...req.body, id: `INS${Date.now()}`, createdAt: new Date().toISOString() }
    all.push(record)
    writeData('ohs_inspections_active.json', all)
    res.json(record)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-inspections-active/:id', (req, res) => {
  try {
    const all = readData('ohs_inspections_active.json')
    const idx = all.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Inspection not found' })
    all[idx] = { ...all[idx], ...req.body }
    writeData('ohs_inspections_active.json', all)
    res.json(all[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/ohs-inspections-active/:id', (req, res) => {
  try {
    let all = readData('ohs_inspections_active.json')
    all = all.filter(r => r.id !== req.params.id)
    writeData('ohs_inspections_active.json', all)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/ohs-inspections-active/:id/answers', (req, res) => {
  try {
    const { answers } = req.body
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers array required' })
    const all = readData('ohs_inspections_active.json')
    const idx = all.findIndex(r => r.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Inspection not found' })
    // Merge answers by questionId, preserve order
    all[idx].questions = (all[idx].questions || []).map(q => {
      const incoming = answers.find(a => a.questionId === q.questionId)
      return incoming ? { ...q, ...incoming } : q
    })
    // Auto-update status
    const allAnswered = all[idx].questions.every(q => q.response != null)
    if (allAnswered) {
      all[idx].status      = 'completed'
      all[idx].completedAt = new Date().toISOString()
    } else if (all[idx].status === 'pending') {
      all[idx].status = 'in-progress'
    }
    writeData('ohs_inspections_active.json', all)
    res.json(all[idx])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/ohs-inspections-active/:id/photo', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })
    res.json({ filename: req.file.filename, name: req.file.originalname })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/ohs-inspections-active/:id/whatsapp-link', (req, res) => {
  try {
    const all = readData('ohs_inspections_active.json')
    const ins = all.find(r => r.id === req.params.id)
    if (!ins) return res.status(404).json({ error: 'Inspection not found' })
    const employees = readData('employees.json')?.employees || []
    const emp = employees.find(e => e.id === ins.assigneeId)
    if (!emp?.phone) return res.json({ url: null, reason: 'no phone' })
    const ip  = getLocalIp()
    const due = ins.dueDate || ins.createdAt?.slice(0, 10) || ''
    const msg = encodeURIComponent(
      `Hi ${ins.assigneeName || emp.name}, you have an OHS inspection due: ${ins.cadence} inspection assigned ${due}. Please complete it here: http://${ip}:5173/inspection/${ins.id}`
    )
    const phone = String(emp.phone).replace(/\D/g, '')
    res.json({ url: `https://wa.me/${phone}?text=${msg}` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// React app catch-all for /inspection/:id (production)
app.get('/inspection/:id', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.redirect(`http://localhost:5173${req.originalUrl}`)
  }
})

// ─── DASHBOARD ────────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
  try {
    const now      = new Date(Date.now() + 2 * 60 * 60 * 1000) // SAST
    const todayStr = now.toISOString().slice(0, 10)
    const monthStr = now.toISOString().slice(0, 7)
    const in14     = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const employees      = readData('employees.json')
    const timelog        = readData('timelog.json')
    const leave          = readData('leave.json')
    const jobs           = readData('jobs.json')
    const tools          = readData('tools.json')
    const stock          = readData('stock.json')
    const ohs            = readData('ohs.json')
    const ohsRisks       = readData('ohs_risks.json')
    const ohsEquipment   = readData('ohs_equipment.json')
    const ohsInspections = readData('ohs_inspections_active.json')

    function toHHMM(isoStr) {
      const sast = new Date(new Date(isoStr).getTime() + 2 * 60 * 60 * 1000)
      return `${String(sast.getUTCHours()).padStart(2, '0')}:${String(sast.getUTCMinutes()).padStart(2, '0')}`
    }
    function toSASTDate(isoStr) {
      // Convert UTC ISO timestamp to SAST date string "YYYY-MM-DD"
      // Pure arithmetic: add 2h offset, extract date components without Intl
      return new Date(new Date(isoStr).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
    }

    // ── HR KPIs ──────────────────────────────────────────────
    // Filter by SAST date (not raw UTC slice) so events near midnight are correct
    const todayLog = timelog.filter(e => e.timestamp && toSASTDate(e.timestamp) === todayStr)
    const empEventsToday = {}
    for (const e of todayLog) {
      if (!empEventsToday[e.employeeId]) empEventsToday[e.employeeId] = []
      empEventsToday[e.employeeId].push(e)
    }
    // clockedInCount: employees whose last event today is type 'in'
    const clockedInCount = Object.values(empEventsToday).filter(evts => {
      const sorted = evts.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      return sorted[sorted.length - 1].type === 'in'
    }).length
    // lateArrivalCount: employees whose first clock-in today was after 08:00 SAST
    const lateArrivalCount = Object.values(empEventsToday).filter(evts => {
      const firstIn = evts.filter(e => e.type === 'in').sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0]
      if (!firstIn) return false
      const sast = new Date(new Date(firstIn.timestamp).getTime() + 2 * 60 * 60 * 1000)
      return sast.getUTCHours() > 8 || (sast.getUTCHours() === 8 && sast.getUTCMinutes() > 0)
    }).length
    const onLeaveToday = leave.filter(l =>
      l.status === 'approved' && l.startDate <= todayStr && l.endDate >= todayStr
    ).length

    // ── PRODUCTION ──────────────────────────────────────────
    const activeJobs         = jobs.filter(j => j.status !== 'complete' && j.status !== 'cancelled')
    const overdueJobs        = activeJobs.filter(j => j.due && j.due < todayStr).length
    const completedThisMonth = jobs.filter(j =>
      j.status === 'complete' && j.completedDate && j.completedDate.startsWith(monthStr)
    ).length

    // ── OHS ─────────────────────────────────────────────────
    const openIncidents      = ohs.filter(i => (i.status || '').toLowerCase() !== 'closed').length
    const overdueInspections = ohsInspections.filter(i =>
      i.status !== 'completed' && (i.dueDate || i.scheduledDate) &&
      (i.dueDate || i.scheduledDate) < todayStr
    ).length
    const overdueReviews     = ohsRisks.filter(r => r.reviewStatus === 'overdue').length
    const equipmentServiceDue = ohsEquipment.filter(eq =>
      eq.nextServiceDate && eq.nextServiceDate <= in14
    ).length

    // ── STOCK ───────────────────────────────────────────────
    const lowStockItems = stock.filter(s => {
      const qty     = s.quantity ?? s.qty ?? 0
      const reorder = s.reorderLevel ?? s.min ?? 5
      return qty <= reorder
    })

    // ── TOOLS ───────────────────────────────────────────────
    const overdueCount = tools.filter(t =>
      t.status === 'overdue' || (t.nextServiceDate && t.nextServiceDate < todayStr)
    ).length
    const missingCount = tools.filter(t => t.status === 'missing').length

    // ── EMPLOYEE STATUS ──────────────────────────────────────
    const employeeStatus = employees.map(emp => {
      const onLeave = leave.find(l =>
        l.status === 'approved' && l.employeeId === emp.id &&
        l.startDate <= todayStr && l.endDate >= todayStr
      )
      if (onLeave) {
        return { id: emp.id, name: emp.name, department: emp.dept || emp.department || '', status: 'leave', clockInTime: null, clockOutTime: null, leaveType: onLeave.type || null }
      }
      const evts    = (empEventsToday[emp.id] || []).slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const lastIn  = [...evts].reverse().find(e => e.type === 'in')
      const lastOut = [...evts].reverse().find(e => e.type === 'out')
      if (!lastIn) {
        return { id: emp.id, name: emp.name, department: emp.dept || emp.department || '', status: 'out', clockInTime: null, clockOutTime: null, leaveType: null }
      }
      const clockInSAST = new Date(new Date(lastIn.timestamp).getTime() + 2 * 60 * 60 * 1000)
      const isLate      = clockInSAST.getUTCHours() > 8 || (clockInSAST.getUTCHours() === 8 && clockInSAST.getUTCMinutes() > 0)
      const hasOut      = lastOut && lastOut.timestamp > lastIn.timestamp
      const status      = hasOut ? 'out' : isLate ? 'late' : 'in'
      return {
        id: emp.id, name: emp.name, department: emp.dept || emp.department || '',
        status, clockInTime: toHHMM(lastIn.timestamp),
        clockOutTime: hasOut ? toHHMM(lastOut.timestamp) : null,
        leaveType: null,
      }
    })

    res.json({
      hr:             { clockedInCount, lateArrivalCount, onLeaveToday, totalEmployees: employees.length },
      production:     { activeJobs: activeJobs.length, overdueJobs, completedThisMonth, jobs },
      ohs:            { openIncidents, overdueInspections, overdueReviews, equipmentServiceDue },
      stock:          { lowStockCount: lowStockItems.length, lowStockItems: lowStockItems.map(s => ({ id: s.id, name: s.name, quantity: s.quantity ?? s.qty ?? 0, reorderLevel: s.reorderLevel ?? s.min ?? 5 })) },
      tools:          { overdueCount, missingCount },
      employeeStatus,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(`[API error] ${req.method} ${req.path}:`, err.message)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`iMoto FMS API running on http://localhost:${PORT}`)
})