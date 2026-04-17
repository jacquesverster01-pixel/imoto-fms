import { Router } from 'express'

function nextJobId(jobs) {
  const nums = jobs
    .map(j => parseInt((j.id || '').replace('JOB-', ''), 10))
    .filter(n => !isNaN(n) && n > 0)
  return 'JOB-' + String(nums.length ? Math.max(...nums) + 1 : 1).padStart(4, '0')
}

function nowTs() {
  return new Date(Date.now() + 2 * 3600000).toISOString().replace('Z', '+02:00')
}

export default function jobsRouter(readData, writeData) {
  const router = Router()

  router.get('/jobs', (req, res) => {
    try { res.json(readData('jobs.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.get('/jobs/:id', (req, res) => {
    try {
      const job = readData('jobs.json').find(j => j.id === req.params.id)
      if (!job) return res.status(404).json({ error: 'Job not found' })
      res.json(job)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/jobs', (req, res) => {
    try {
      const jobs = readData('jobs.json')
      const ts   = nowTs()
      const newJob = { id: nextJobId(jobs), createdAt: ts, updatedAt: ts, ...req.body }
      jobs.push(newJob)
      writeData('jobs.json', jobs)
      res.json(newJob)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/jobs/:id', (req, res) => {
    try {
      const jobs = readData('jobs.json')
      const idx  = jobs.findIndex(j => j.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Job not found' })
      jobs[idx] = { ...jobs[idx], ...req.body, id: jobs[idx].id, updatedAt: nowTs() }
      writeData('jobs.json', jobs)
      res.json(jobs[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.patch('/jobs/:id/task/:taskId', (req, res) => {
    try {
      const jobs = readData('jobs.json')
      const idx  = jobs.findIndex(j => j.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Job not found' })
      const tIdx = (jobs[idx].tasks || []).findIndex(t => t.id === req.params.taskId)
      if (tIdx === -1) return res.status(404).json({ error: 'Task not found' })
      jobs[idx].tasks[tIdx] = { ...jobs[idx].tasks[tIdx], ...req.body }
      jobs[idx].updatedAt   = nowTs()
      writeData('jobs.json', jobs)
      res.json(jobs[idx].tasks[tIdx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/jobs/:id', (req, res) => {
    try {
      let jobs = readData('jobs.json')
      if (!jobs.find(j => j.id === req.params.id)) return res.status(404).json({ error: 'Job not found' })
      writeData('jobs.json', jobs.filter(j => j.id !== req.params.id))
      res.json({ success: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
