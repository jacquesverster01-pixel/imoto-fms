import { Router } from 'express'

export default function employeesRouter(readData, writeData, upload) {
  const router = Router()

  router.get('/employees', (req, res) => {
    try {
      const employees = readData('employees.json')
      res.json({ employees })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/employees', (req, res) => {
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

  router.put('/employees/:id', (req, res) => {
    try {
      const employees = readData('employees.json')
      const idx = employees.findIndex(e => e.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Employee not found' })
      employees[idx] = { ...employees[idx], ...req.body }
      writeData('employees.json', employees)
      res.json(employees[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/employees/:id', (req, res) => {
    try {
      const employees = readData('employees.json')
      const idx = employees.findIndex(e => e.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Employee not found' })
      const removed = employees.splice(idx, 1)
      writeData('employees.json', employees)
      res.json(removed[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/employees/rename-dept', (req, res) => {
    try {
      const { from, to } = req.body
      if (!from || !to) return res.status(400).json({ error: 'from and to required' })
      const employees = readData('employees.json')
      employees.forEach(e => { if (e.dept === from) e.dept = to })
      writeData('employees.json', employees)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // docType: cv | driversLicense | contract | teamInfoSheet
  router.post('/employees/:id/upload', upload.single('file'), (req, res) => {
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

  // ─── EXCUSED ABSENCES ─────────────────────────────────────

  router.get('/excused', (_req, res) => {
    try { res.json(readData('excused.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/excused', (req, res) => {
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

  router.delete('/excused/:id', (req, res) => {
    try {
      const records = readData('excused.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Record not found' })
      const removed = records.splice(idx, 1)
      writeData('excused.json', records)
      res.json(removed[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
