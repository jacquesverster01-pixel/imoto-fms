import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function riskRatingFromScore(score) {
  if (score >= 13) return 'Critical'
  if (score >= 7)  return 'High'
  if (score >= 4)  return 'Medium'
  return 'Low'
}

function calcRiskFields(body) {
  const rec = { ...body }
  rec.riskScore      = (rec.likelihood || 1) * (rec.severity || 1)
  rec.riskRating     = riskRatingFromScore(rec.riskScore)
  rec.residualScore  = (rec.residualLikelihood || 1) * (rec.residualSeverity || 1)
  rec.residualRating = riskRatingFromScore(rec.residualScore)
  return rec
}

function getLocalIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return 'localhost'
}

const OHS_FILE_ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

// ─── Router factory ───────────────────────────────────────────────────────────

export default function ohsRouter(readData, writeData, upload, uploadsDir) {
  const router = Router()

  // ─── OHS INCIDENTS ─────────────────────────────────────────────────────────

  router.get('/ohs', (req, res) => {
    try { res.json(readData('ohs.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs', (req, res) => {
    try {
      const records = readData('ohs.json')
      const record = { correctiveActions: [], ...req.body, id: `OHS${Date.now()}`, status: req.body.status || 'Open', createdAt: new Date().toISOString() }
      records.push(record)
      writeData('ohs.json', records)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs/:id', (req, res) => {
    try {
      const records = readData('ohs.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
      records[idx] = { ...records[idx], ...req.body }
      writeData('ohs.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs/:id', (req, res) => {
    try {
      const records = readData('ohs.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
      const removed = records.splice(idx, 1)
      writeData('ohs.json', records)
      res.json(removed[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs/:id/action', (req, res) => {
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

  router.put('/ohs/:id/action/:actionId', (req, res) => {
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

  router.delete('/ohs/:id/action/:actionId', (req, res) => {
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

  // ─── OHS TEMPLATES (legacy) ────────────────────────────────────────────────

  router.get('/ohs-templates', (req, res) => {
    try { res.json(readData('ohs_templates.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-templates', (req, res) => {
    try {
      const templates = readData('ohs_templates.json')
      const template = { items: [], ...req.body, id: `TPL${Date.now()}` }
      templates.push(template)
      writeData('ohs_templates.json', templates)
      res.json(template)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-templates/:id', (req, res) => {
    try {
      const templates = readData('ohs_templates.json')
      const idx = templates.findIndex(t => t.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Template not found' })
      templates[idx] = { ...templates[idx], ...req.body }
      writeData('ohs_templates.json', templates)
      res.json(templates[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-templates/:id', (req, res) => {
    try {
      const templates = readData('ohs_templates.json')
      const idx = templates.findIndex(t => t.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Template not found' })
      const removed = templates.splice(idx, 1)
      writeData('ohs_templates.json', templates)
      res.json(removed[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // ─── OHS INSPECTIONS (legacy) ──────────────────────────────────────────────

  router.get('/ohs-inspections', (req, res) => {
    try { res.json(readData('ohs_inspections.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-inspections', (req, res) => {
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

  router.put('/ohs-inspections/:id', (req, res) => {
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
              severity: 2, likelihood: 2, riskScore: 4,
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

  router.delete('/ohs-inspections/:id', (req, res) => {
    try {
      const inspections = readData('ohs_inspections.json')
      const idx = inspections.findIndex(i => i.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Inspection not found' })
      const removed = inspections.splice(idx, 1)
      writeData('ohs_inspections.json', inspections)
      res.json(removed[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // ─── OHS EQUIPMENT ─────────────────────────────────────────────────────────

  router.get('/ohs-equipment', (req, res) => {
    try { res.json(readData('ohs_equipment.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-equipment', (req, res) => {
    try {
      const records = readData('ohs_equipment.json')
      const record = { ...req.body, id: `EQ${Date.now()}`, createdAt: new Date().toISOString() }
      records.push(record)
      writeData('ohs_equipment.json', records)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-equipment/:id', (req, res) => {
    try {
      const records = readData('ohs_equipment.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Equipment not found' })
      records[idx] = { ...records[idx], ...req.body }
      writeData('ohs_equipment.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-equipment/:id', (req, res) => {
    try {
      let records = readData('ohs_equipment.json')
      records = records.filter(r => r.id !== req.params.id)
      writeData('ohs_equipment.json', records)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-equipment/:id/upload', upload.single('file'), (req, res) => {
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

  router.get('/ohs-equipment/:id/service-history', (req, res) => {
    try {
      const records = readData('ohs_equipment.json')
      const item = records.find(r => r.id === req.params.id)
      if (!item) return res.status(404).json({ error: 'Equipment not found' })
      res.json(item.serviceHistory || [])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-equipment/:id/service-history', (req, res) => {
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

  // ─── OHS RISK REGISTER ─────────────────────────────────────────────────────

  router.get('/ohs-risks', (req, res) => {
    try { res.json(readData('ohs_risks.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-risks', (req, res) => {
    try {
      const records = readData('ohs_risks.json')
      const record = { ...calcRiskFields(req.body), id: `RSK${Date.now()}`, createdAt: new Date().toISOString() }
      records.push(record)
      writeData('ohs_risks.json', records)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-risks/:id', (req, res) => {
    try {
      const records = readData('ohs_risks.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Risk not found' })
      records[idx] = { ...records[idx], ...calcRiskFields(req.body) }
      writeData('ohs_risks.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-risks/:id', (req, res) => {
    try {
      let records = readData('ohs_risks.json')
      records = records.filter(r => r.id !== req.params.id)
      writeData('ohs_risks.json', records)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.get('/ohs-risks/review-status', (req, res) => {
    try {
      const records = readData('ohs_risks.json')
      const today = new Date().toISOString().slice(0, 10)
      const result = records.map(r => {
        let status = r.reviewStatus || 'due'
        if (r.nextReviewDate && r.nextReviewDate < today) status = 'overdue'
        return { id: r.id, title: r.title, reviewStatus: status, lastReviewDate: r.lastReviewDate || null, nextReviewDate: r.nextReviewDate || null, reviewIntervalDays: r.reviewIntervalDays || 90 }
      })
      res.json(result)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-risks/:id/review', (req, res) => {
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
          records[idx] = { ...r, likelihood, severity, riskScore: likelihood * severity, riskRating: riskRatingFromScore(likelihood * severity) }
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
        ...records[idx], lastReviewDate: today, nextReviewDate, reviewStatus: 'ok',
        reviewNotes: [...(risk.reviewNotes || []), { id: `RN${Date.now()}`, date: today, author: author || '', note: note || '' }],
      }
      writeData('ohs_risks.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // ─── OHS ZONES ─────────────────────────────────────────────────────────────

  router.get('/ohs-zones', (req, res) => {
    try { res.json(readData('ohs_zones.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-zones', (req, res) => {
    try { writeData('ohs_zones.json', req.body); res.json(req.body) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  // ─── OHS MAP ASSETS ────────────────────────────────────────────────────────

  router.get('/ohs-map-assets', (req, res) => {
    try { res.json(readData('ohs_map_assets.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-map-assets', (req, res) => {
    try { writeData('ohs_map_assets.json', req.body); res.json(req.body) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-map-assets/:id', (req, res) => {
    try {
      const data = readData('ohs_map_assets.json')
      const assets = Array.isArray(data.assets) ? data.assets : []
      const idx = assets.findIndex(a => a.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Asset not found' })
      assets[idx] = { ...assets[idx], ...req.body }
      writeData('ohs_map_assets.json', { assets })
      res.json(assets[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-map-assets/:id', (req, res) => {
    try {
      const data = readData('ohs_map_assets.json')
      const assets = (Array.isArray(data.assets) ? data.assets : []).filter(a => a.id !== req.params.id)
      writeData('ohs_map_assets.json', { assets })
      res.json({ id: req.params.id })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // ─── OHS FILES ─────────────────────────────────────────────────────────────

  router.post('/ohs-files/upload', upload.single('file'), (req, res) => {
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

  router.get('/ohs-files', (req, res) => {
    try {
      const { context, contextId } = req.query
      let records = readData('ohs_files.json')
      if (context) records = records.filter(r => r.context === context)
      if (contextId !== undefined) records = records.filter(r => contextId ? r.contextId === contextId : !r.contextId)
      res.json(records)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-files/:id', (req, res) => {
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

  // ─── OHS LAW REFERENCE ─────────────────────────────────────────────────────

  router.get('/ohs-law-reference', (req, res) => {
    try { res.json(readData('ohs_law_reference.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  // ─── OHS APPOINTMENTS ──────────────────────────────────────────────────────

  router.get('/ohs-appointments', (_req, res) => {
    try { res.json(readData('ohs_appointments.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-appointments', (req, res) => {
    try {
      const records = readData('ohs_appointments.json')
      const record = { ...req.body, id: `APT${Date.now()}`, createdAt: new Date().toISOString() }
      records.push(record)
      writeData('ohs_appointments.json', records)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-appointments/:id', (req, res) => {
    try {
      const records = readData('ohs_appointments.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Appointment not found' })
      records[idx] = { ...records[idx], ...req.body }
      writeData('ohs_appointments.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-appointments/:id', (req, res) => {
    try {
      let records = readData('ohs_appointments.json')
      records = records.filter(r => r.id !== req.params.id)
      writeData('ohs_appointments.json', records)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-appointments/:id/upload', upload.single('file'), (req, res) => {
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

  // ─── OHS APPOINTMENT TYPES ─────────────────────────────────────────────────

  router.get('/ohs-appointment-types', (_req, res) => {
    try { res.json(readData('ohs_appointment_types.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-appointment-types', (req, res) => {
    try {
      const records = readData('ohs_appointment_types.json')
      const record = { ...req.body, id: `AT${Date.now()}` }
      records.push(record)
      writeData('ohs_appointment_types.json', records)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-appointment-types/:id', (req, res) => {
    try {
      const records = readData('ohs_appointment_types.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Appointment type not found' })
      records[idx] = { ...records[idx], ...req.body }
      writeData('ohs_appointment_types.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-appointment-types/:id', (req, res) => {
    try {
      let records = readData('ohs_appointment_types.json')
      records = records.filter(r => r.id !== req.params.id)
      writeData('ohs_appointment_types.json', records)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // ─── OHS INSPECTION TEMPLATES ──────────────────────────────────────────────

  router.get('/ohs-inspection-templates', (_req, res) => {
    try {
      const all = readData('ohs_inspection_templates.json')
      res.json({
        weekly:    all.filter(t => t.cadence === 'weekly'),
        monthly:   all.filter(t => t.cadence === 'monthly'),
        quarterly: all.filter(t => t.cadence === 'quarterly'),
      })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-inspection-templates', (req, res) => {
    try {
      const all    = readData('ohs_inspection_templates.json')
      const prefix = req.body.cadence === 'weekly' ? 'WQ' : req.body.cadence === 'monthly' ? 'MQ' : 'QQ'
      const record = { active: true, requiresPhoto: false, ...req.body, id: `${prefix}${Date.now()}` }
      all.push(record)
      writeData('ohs_inspection_templates.json', all)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-inspection-templates/:id', (req, res) => {
    try {
      const all = readData('ohs_inspection_templates.json')
      const idx = all.findIndex(t => t.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Template question not found' })
      all[idx] = { ...all[idx], ...req.body }
      writeData('ohs_inspection_templates.json', all)
      res.json(all[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-inspection-templates/:id', (req, res) => {
    try {
      let all = readData('ohs_inspection_templates.json')
      all = all.filter(t => t.id !== req.params.id)
      writeData('ohs_inspection_templates.json', all)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // ─── OHS INSPECTION RUNS (ACTIVE) ──────────────────────────────────────────

  router.get('/ohs-inspections-active', (_req, res) => {
    try { res.json(readData('ohs_inspections_active.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.get('/ohs-inspections-active/:id', (req, res) => {
    try {
      const all = readData('ohs_inspections_active.json')
      const ins = all.find(r => r.id === req.params.id)
      if (!ins) return res.status(404).json({ error: 'Inspection not found' })
      res.json(ins)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-inspections-active', (req, res) => {
    try {
      const all    = readData('ohs_inspections_active.json')
      const record = { status: 'pending', ...req.body, id: `INS${Date.now()}`, createdAt: new Date().toISOString() }
      all.push(record)
      writeData('ohs_inspections_active.json', all)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-inspections-active/:id', (req, res) => {
    try {
      const all = readData('ohs_inspections_active.json')
      const idx = all.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Inspection not found' })
      all[idx] = { ...all[idx], ...req.body }
      writeData('ohs_inspections_active.json', all)
      res.json(all[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-inspections-active/:id', (req, res) => {
    try {
      let all = readData('ohs_inspections_active.json')
      all = all.filter(r => r.id !== req.params.id)
      writeData('ohs_inspections_active.json', all)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-inspections-active/:id/answers', (req, res) => {
    try {
      const { answers } = req.body
      if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers array required' })
      const all = readData('ohs_inspections_active.json')
      const idx = all.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Inspection not found' })
      all[idx].questions = (all[idx].questions || []).map(q => {
        const incoming = answers.find(a => a.questionId === q.questionId)
        return incoming ? { ...q, ...incoming } : q
      })
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

  router.post('/ohs-inspections-active/:id/photo', upload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file received' })
      res.json({ filename: req.file.filename, name: req.file.originalname })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.get('/ohs-inspections-active/:id/whatsapp-link', (req, res) => {
    try {
      const all = readData('ohs_inspections_active.json')
      const ins = all.find(r => r.id === req.params.id)
      if (!ins) return res.status(404).json({ error: 'Inspection not found' })
      const employees = readData('employees.json') || []
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

  return router
}
