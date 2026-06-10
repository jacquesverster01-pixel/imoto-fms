import { Router } from 'express'

// OHS legal appointments (ohs_appointments.json) + appointment types (ohs_appointment_types.json)
export default function appointmentsRouter(readData, writeData, upload) {
  const router = Router()

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

  return router
}
