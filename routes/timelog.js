import { Router } from 'express'

export default function timelogRouter(readData, writeData) {
  const router = Router()

  router.get('/timelog', (req, res) => {
    try { res.json(readData('timelog.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/timelog', (req, res) => {
    try {
      const timelog = readData('timelog.json')
      const entry = { timestamp: new Date().toISOString(), ...req.body, id: `TL${Date.now()}` }
      timelog.push(entry)
      writeData('timelog.json', timelog)
      res.json(entry)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/timelog', (req, res) => {
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

  router.put('/timelog/:id', (req, res) => {
    try {
      const timelog = readData('timelog.json')
      const idx = timelog.findIndex(e => e.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Entry not found' })
      timelog[idx] = { ...timelog[idx], ...req.body }
      writeData('timelog.json', timelog)
      res.json(timelog[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Delete all entries within a date range
  // Body: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', source?: 'all'|'biometric'|'manual' }
  router.delete('/timelog/range', (req, res) => {
    try {
      const { from, to, source = 'all' } = req.body
      if (!from || !to) return res.status(400).json({ error: 'from and to are required' })
      const fromTs = from + 'T00:00:00.000Z'
      const toTs   = to   + 'T23:59:59.999Z'
      const timelog = readData('timelog.json')

      const toDelete = timelog.filter(e => {
        const inRange = e.timestamp >= fromTs && e.timestamp <= toTs
        if (!inRange) return false
        if (source === 'biometric' && e.source !== 'biometric') return false
        if (source === 'manual'    && e.source === 'biometric') return false
        return true
      })

      // Block deleted biometric entries from being re-imported by the poll loop
      const bioDeleted = toDelete.filter(e => e.source === 'biometric')
      if (bioDeleted.length > 0) {
        const existing = readData('timelog_blocked.json')
        const newKeys  = bioDeleted.map(e => `${e.employeeId}|${e.timestamp}`)
        writeData('timelog_blocked.json', [...new Set([...existing, ...newKeys])])
      }

      const kept = timelog.filter(e => !toDelete.includes(e))
      writeData('timelog.json', kept)
      res.json({ deleted: toDelete.length })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/timelog/:id', (req, res) => {
    try {
      const timelog = readData('timelog.json')
      const idx = timelog.findIndex(e => e.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Entry not found' })
      const removed = timelog.splice(idx, 1)
      writeData('timelog.json', timelog)
      res.json(removed[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
