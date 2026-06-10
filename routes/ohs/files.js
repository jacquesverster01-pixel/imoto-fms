import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const OHS_FILE_ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

// OHS file library (ohs_files.json) + law reference (ohs_law_reference.json)
export default function filesRouter(readData, writeData, upload, uploadsDir) {
  const router = Router()

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

  router.get('/ohs-law-reference', (req, res) => {
    try { res.json(readData('ohs_law_reference.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
