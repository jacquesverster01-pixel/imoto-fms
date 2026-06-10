import { Router } from 'express'

// OHS incidents + corrective actions (ohs.json)
export default function incidentsRouter(readData, writeData) {
  const router = Router()

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

  return router
}
