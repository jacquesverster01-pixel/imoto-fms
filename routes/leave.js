import { Router } from 'express'

export default function leaveRouter(readData, writeData, upload) {
  const router = Router()

  router.get('/leave', (req, res) => {
    try { res.json(readData('leave.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/leave', (req, res) => {
    try {
      const leave = readData('leave.json')
      const entry = { ...req.body, id: `LV${Date.now()}`, createdAt: new Date().toISOString() }
      leave.push(entry)
      writeData('leave.json', leave)
      res.json(entry)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/leave/:id', (req, res) => {
    try {
      const leave = readData('leave.json')
      const idx = leave.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Leave record not found' })
      leave[idx] = { ...leave[idx], ...req.body }
      writeData('leave.json', leave)
      res.json(leave[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/leave/:id', (req, res) => {
    try {
      const leave = readData('leave.json')
      const idx = leave.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Leave record not found' })
      const removed = leave.splice(idx, 1)
      writeData('leave.json', leave)
      res.json(removed[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/leave/:id/upload', upload.single('file'), (req, res) => {
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

  return router
}
