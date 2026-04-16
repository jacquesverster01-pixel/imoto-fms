import { Router } from 'express'

export default function disciplinaryRouter(readData, writeData, upload) {
  const router = Router()

  router.get('/disciplinary', (req, res) => {
    try { res.json(readData('disciplinary.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/disciplinary', (req, res) => {
    try {
      const records = readData('disciplinary.json')
      const record = { attachments: [], ...req.body, id: `DC${Date.now()}`, status: 'pending_document' }
      records.push(record)
      writeData('disciplinary.json', records)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/disciplinary/:id', (req, res) => {
    try {
      const records = readData('disciplinary.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Record not found' })
      records[idx] = { ...records[idx], ...req.body }
      writeData('disciplinary.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/disciplinary/:id', (req, res) => {
    try {
      const records = readData('disciplinary.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Record not found' })
      const removed = records.splice(idx, 1)
      writeData('disciplinary.json', records)
      res.json(removed[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/disciplinary/:id/upload', upload.single('file'), (req, res) => {
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

  return router
}
