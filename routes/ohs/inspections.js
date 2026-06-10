import { Router } from 'express'
import os from 'os'

function getLocalIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return 'localhost'
}

// OHS inspections: legacy templates + inspections, inspection question templates,
// and the active inspection-run workflow.
export default function inspectionsRouter(readData, writeData, upload) {
  const router = Router()

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
      try {
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
      } catch { return res.status(500).json({ error: 'Save failed' }) }
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
