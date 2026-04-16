import { Router } from 'express'

export default function jobsRouter(readData, writeData) {
  const router = Router()

  router.get('/jobs', (req, res) => {
    try { res.json(readData('jobs.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/jobs', (req, res) => {
    try {
      const jobs = readData('jobs.json')
      const newJob = { ...req.body, id: `J${String(jobs.length + 1).padStart(3, '0')}` }
      jobs.push(newJob)
      writeData('jobs.json', jobs)
      res.json(newJob)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/jobs/:id', (req, res) => {
    try {
      const jobs = readData('jobs.json')
      const idx = jobs.findIndex(j => j.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Job not found' })
      jobs[idx] = { ...jobs[idx], ...req.body }
      writeData('jobs.json', jobs)
      res.json(jobs[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/jobs/:id', (req, res) => {
    try {
      let jobs = readData('jobs.json')
      const exists = jobs.some(j => j.id === req.params.id)
      if (!exists) return res.status(404).json({ error: 'Job not found' })
      jobs = jobs.filter(j => j.id !== req.params.id)
      writeData('jobs.json', jobs)
      res.json({ success: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
