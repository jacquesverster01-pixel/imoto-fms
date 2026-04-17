import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { initZKService, startPollLoop, pullHistoricalLogs, getDeviceUsers, getDeviceStatus, getZkInstance, resetConnection } from './zkService.js'

import unleashedRouter   from './routes/unleashed.js'
import employeesRouter   from './routes/employees.js'
import timelogRouter     from './routes/timelog.js'
import leaveRouter       from './routes/leave.js'
import disciplinaryRouter from './routes/disciplinary.js'
import jobsRouter        from './routes/jobs.js'
import toolsRouter       from './routes/tools.js'
import stockRouter       from './routes/stock.js'
import zkRouter          from './routes/zk.js'
import settingsRouter    from './routes/settings.js'
import ohsRouter         from './routes/ohs.js'
import dashboardRouter   from './routes/dashboard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001

// ─── FILE STORAGE ─────────────────────────────────────────────────────────────

const uploadsDir = path.join(__dirname, 'data', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
const upload = multer({ dest: uploadsDir })

// ─── DATA FILE INITIALISATION ─────────────────────────────────────────────────

const DATA_INITS = {
  'employees.json':              [],
  'timelog.json':                [],
  'leave.json':                  [],
  'excused.json':                [],
  'disciplinary.json':           [],
  'jobs.json':                   [],
  'tools.json':                  [],
  'stock.json':                  [],
  'ohs.json':                    [],
  'ohs_templates.json':          [],
  'ohs_inspections.json':        [],
  'ohs_equipment.json':          [],
  'ohs_risks.json':              [],
  'ohs_appointments.json':       [],
  'ohs_files.json':              [],
  'ohs_map_assets.json':         { assets: [] },
  'ohs_zones.json':              { canvasWidth: 900, canvasHeight: 600, zones: [] },
  'timelog_blocked.json':        [],
}
for (const [file, empty] of Object.entries(DATA_INITS)) {
  const fp = path.join(__dirname, 'data', file)
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(empty))
}

// ohs_inspection_templates — initialise with default questions if missing
const OHS_INS_TEMPLATES_FILE = path.join(__dirname, 'data', 'ohs_inspection_templates.json')
if (!fs.existsSync(OHS_INS_TEMPLATES_FILE)) {
  fs.writeFileSync(OHS_INS_TEMPLATES_FILE, JSON.stringify([
    { id:'WQ1', cadence:'weekly',    text:'Emergency exits clear and unobstructed',                           requiresPhoto:false, active:true },
    { id:'WQ2', cadence:'weekly',    text:'Fire extinguishers visible and unobstructed',                      requiresPhoto:false, active:true },
    { id:'WQ3', cadence:'weekly',    text:'First aid kit accessible and sealed',                              requiresPhoto:false, active:true },
    { id:'WQ4', cadence:'weekly',    text:'Housekeeping — aisles and workstations clear',                     requiresPhoto:false, active:true },
    { id:'WQ5', cadence:'weekly',    text:'PPE available and in good condition',                              requiresPhoto:false, active:true },
    { id:'WQ6', cadence:'weekly',    text:'No visible electrical hazards (exposed wires, overloaded sockets)',requiresPhoto:false, active:true },
    { id:'WQ7', cadence:'weekly',    text:'Spill kits in place and stocked',                                 requiresPhoto:false, active:true },
    { id:'WQ8', cadence:'weekly',    text:'Safety signage visible and legible',                              requiresPhoto:false, active:true },
    { id:'MQ1', cadence:'monthly',   text:'Fire extinguisher pressure gauges checked',                        requiresPhoto:false, active:true },
    { id:'MQ2', cadence:'monthly',   text:'First aid kit contents checked and restocked if needed',           requiresPhoto:false, active:true },
    { id:'MQ3', cadence:'monthly',   text:'Emergency lighting tested',                                        requiresPhoto:false, active:true },
    { id:'MQ4', cadence:'monthly',   text:'Machinery guards in place and secure',                             requiresPhoto:false, active:true },
    { id:'MQ5', cadence:'monthly',   text:'Chemical storage — containers labelled and sealed',                requiresPhoto:false, active:true },
    { id:'MQ6', cadence:'monthly',   text:'Incident register reviewed',                                       requiresPhoto:false, active:true },
    { id:'MQ7', cadence:'monthly',   text:'PPE inspection — replace damaged items',                           requiresPhoto:false, active:true },
    { id:'MQ8', cadence:'monthly',   text:'Housekeeping audit of storage areas',                              requiresPhoto:false, active:true },
    { id:'QQ1', cadence:'quarterly', text:'Full fire equipment service check',                                requiresPhoto:false, active:true },
    { id:'QQ2', cadence:'quarterly', text:'Emergency evacuation drill conducted',                             requiresPhoto:false, active:true },
    { id:'QQ3', cadence:'quarterly', text:'OHS legal appointments reviewed and up to date',                   requiresPhoto:false, active:true },
    { id:'QQ4', cadence:'quarterly', text:'Risk register reviewed',                                           requiresPhoto:false, active:true },
    { id:'QQ5', cadence:'quarterly', text:'SHE rep consultation meeting held',                                requiresPhoto:false, active:true },
    { id:'QQ6', cadence:'quarterly', text:'Employee OHS training records reviewed',                           requiresPhoto:false, active:true },
    { id:'QQ7', cadence:'quarterly', text:'Noise and dust levels assessed',                                   requiresPhoto:false, active:true },
    { id:'QQ8', cadence:'quarterly', text:'First aid training currency checked',                              requiresPhoto:false, active:true },
  ], null, 2))
}

// ohs_appointment_types — initialise with defaults if missing
const OHS_APPT_TYPES_FILE = path.join(__dirname, 'data', 'ohs_appointment_types.json')
if (!fs.existsSync(OHS_APPT_TYPES_FILE)) {
  fs.writeFileSync(OHS_APPT_TYPES_FILE, JSON.stringify([
    { id: 'AT1', label: 'SHE Representative',             legalRef: 'OHS Act Section 17' },
    { id: 'AT2', label: 'First Aider',                    legalRef: 'OHS Act General Safety Reg 3' },
    { id: 'AT3', label: 'Fire Fighter',                   legalRef: 'OHS Act Section 26' },
    { id: 'AT4', label: 'Safety Officer',                 legalRef: 'OHS Act Section 16(2)' },
    { id: 'AT5', label: 'Incident Investigator',          legalRef: 'OHS Act Section 24' },
    { id: 'AT6', label: 'Emergency Coordinator',          legalRef: 'OHS Act Section 26' },
    { id: 'AT7', label: 'Hazardous Chemical Handler',     legalRef: 'HCS Reg 4' },
    { id: 'AT8', label: 'Stacking & Storage Supervisor',  legalRef: 'OHS Act GSR 8' },
  ]))
}

// ohs_inspections_active — initialise if missing
const OHS_INS_ACTIVE_FILE = path.join(__dirname, 'data', 'ohs_inspections_active.json')
if (!fs.existsSync(OHS_INS_ACTIVE_FILE)) fs.writeFileSync(OHS_INS_ACTIVE_FILE, '[]')

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(cors())
app.use(express.json())

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

function readData(file) {
  const filePath = path.join(__dirname, 'data', file)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (err) {
    throw new Error(`Failed to read ${file}: ${err.message}`)
  }
}

function writeData(file, data) {
  const filePath = path.join(__dirname, 'data', file)
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (err) {
    throw new Error(`Failed to write ${file}: ${err.message}`)
  }
}

// ─── ZK SERVICE ───────────────────────────────────────────────────────────────

initZKService(readData, writeData)
startPollLoop()

// ─── AUTO CLOCK-OUT ───────────────────────────────────────────────────────────

setInterval(() => {
  try {
    const settings = readData('settings.json')
    const aco = settings?.autoClockOut
    if (!aco?.enabled || !aco.time) return
    const now = new Date(Date.now() + 2 * 3600 * 1000) // SAST = UTC+2
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(now.getUTCMinutes()).padStart(2, '0')
    if (`${hh}:${mm}` !== aco.time) return
    const timelog  = readData('timelog.json')
    const employees = readData('employees.json')?.employees || []
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

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Serve uploaded files — must be registered BEFORE /api routes
app.use('/uploads', express.static(uploadsDir))

app.use('/api', employeesRouter(readData, writeData, upload))
app.use('/api', timelogRouter(readData, writeData))
app.use('/api', leaveRouter(readData, writeData, upload))
app.use('/api', disciplinaryRouter(readData, writeData, upload))
app.use('/api', jobsRouter(readData, writeData))
app.use('/api', toolsRouter(readData, writeData))
app.use('/api', stockRouter(readData, writeData))
app.use('/api', zkRouter(readData, writeData, { getDeviceStatus, pullHistoricalLogs, getDeviceUsers, getZkInstance, resetConnection }))
app.use('/api', settingsRouter(readData, writeData))
app.use('/api', ohsRouter(readData, writeData, upload, uploadsDir))
app.use('/api', dashboardRouter(readData))
app.use('/api/unleashed', unleashedRouter)


// React app catch-all for /inspection/:id (production)
app.get('/inspection/:id', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.redirect(`http://localhost:5173${req.originalUrl}`)
  }
})

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error(`[API error] ${req.method} ${req.path}:`, err.message)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`iMoto FMS API running on http://localhost:${PORT}`)
})
