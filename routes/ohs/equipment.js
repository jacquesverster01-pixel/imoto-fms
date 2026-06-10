import { Router } from 'express'

// OHS equipment register + service history (ohs_equipment.json)
export default function equipmentRouter(readData, writeData, upload) {
  const router = Router()

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

  return router
}
