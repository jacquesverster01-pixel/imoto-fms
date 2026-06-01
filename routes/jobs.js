import { Router } from 'express'
import { randomUUID } from 'crypto'
import nodePath from 'path'
import fs from 'fs'

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function findTaskById(tasks, id) {
  for (const t of tasks) {
    if (t.id === id) return t;
    const children = t.children || t.subTasks || [];
    if (children.length) {
      const found = findTaskById(children, id);
      if (found) return found;
    }
  }
  return null;
}

export default function jobsRouter(readData, writeData, upload, uploadsDir) {
  const router = Router()

  // GET /api/jobs/assemblies — must be before /:id to avoid param capture
  router.get('/jobs/assemblies', (req, res) => {
    try { res.json(readData('assemblies.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  // POST /api/jobs/assemblies
  router.post('/jobs/assemblies', (req, res) => {
    try {
      const data = readData('assemblies.json')
      const { name, tasks } = req.body
      const asm = {
        id: newId('asm'),
        name: name || 'Untitled assembly',
        tasks: Array.isArray(tasks) ? tasks : []
      }
      data.assemblies.push(asm)
      writeData('assemblies.json', data)
      res.json(asm)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // GET /api/jobs
  router.get('/jobs', (req, res) => {
    try { res.json(readData('jobs.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  // POST /api/jobs
  router.post('/jobs', (req, res) => {
    try {
      const data = readData('jobs.json')
      const { title, status, assemblyId, bomId, colour, dueDate, tasks } = req.body
      const today = new Date().toISOString().split('T')[0]
      const startDate = req.body.startDate || today
      const job = {
        id: newId('job'),
        title: title || 'Untitled job',
        status: status || 'quote',
        assemblyId: assemblyId || null,
        bomId: bomId || null,
        colour: colour || '#dbeafe',
        startDate,
        dueDate: dueDate || null,
        tasks: Array.isArray(tasks) ? tasks : [],
        createdAt: new Date().toISOString()
      }
      data.jobs.push(job)
      writeData('jobs.json', data)
      res.json(job)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // PATCH /api/jobs/:id/labour — update labour estimate only
  router.patch('/jobs/:id/labour', (req, res) => {
    try {
      const data = readData('jobs.json')
      const job = data.jobs.find(j => j.id === req.params.id)
      if (!job) return res.status(404).json({ error: 'Job not found' })
      job.labourEstimate = parseFloat(req.body.labourEstimate) || 0
      writeData('jobs.json', data)
      res.json(job)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // PUT /api/jobs/:id/baseline — snapshot task dates as baseline
  router.put('/jobs/:id/baseline', (req, res) => {
    try {
      const data = readData('jobs.json')
      const idx = data.jobs.findIndex(j => j.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Job not found' })
      data.jobs[idx].baseline = Array.isArray(req.body.baseline) ? req.body.baseline : []
      writeData('jobs.json', data)
      res.json(data.jobs[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // PUT /api/jobs/:id — update job fields (includes tasks for planner)
  router.put('/jobs/:id', (req, res) => {
    try {
      const data = readData('jobs.json')
      const idx = data.jobs.findIndex(j => j.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Job not found' })
      const existing = data.jobs[idx]
      const rawStatus = req.body.status
      const status = rawStatus === 'in_progress' ? 'in-production' : (rawStatus || existing.status)
      const allowed = ['title', 'colour', 'startDate', 'dueDate', 'assemblyId', 'bomId', 'tasks', 'sourceBomId', 'sourceProductCode', 'labourEstimate']
      allowed.forEach(k => {
        if (req.body[k] !== undefined) data.jobs[idx][k] = req.body[k]
      })
      data.jobs[idx].status = status
      writeData('jobs.json', data)
      res.json(data.jobs[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // PUT /api/jobs/:id/tasks — replace full task array (Gantt saves)
  router.put('/jobs/:id/tasks', (req, res) => {
    try {
      const data = readData('jobs.json')
      const idx = data.jobs.findIndex(j => j.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Job not found' })
      const tasks = Array.isArray(req.body.tasks) ? req.body.tasks : []
      data.jobs[idx].tasks = tasks
      const ends = tasks.map(t => t.endDate).filter(Boolean).sort()
      if (ends.length) data.jobs[idx].dueDate = ends[ends.length - 1]
      writeData('jobs.json', data)
      res.json(data.jobs[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // POST /api/jobs/:jobId/tasks/:taskId/files — upload a file attachment
  router.post('/jobs/:jobId/tasks/:taskId/files', upload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file received' })
      const ext = nodePath.extname(req.file.originalname)
      const storedName = `task-${randomUUID()}${ext}`
      fs.renameSync(req.file.path, nodePath.join(uploadsDir, storedName))
      res.json({
        id: `tf-${Date.now()}`,
        name: req.file.originalname,
        filename: storedName,
        url: `/uploads/${storedName}`,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // PATCH /api/jobs/:id/task/:taskId — partial update a single task
  router.patch('/jobs/:id/task/:taskId', (req, res) => {
    try {
      const data = readData('jobs.json')
      const jobIdx = data.jobs.findIndex(j => j.id === req.params.id)
      if (jobIdx === -1) return res.status(404).json({ error: 'Job not found' })
      const task = findTaskById(data.jobs[jobIdx].tasks, req.params.taskId)
      if (!task) return res.status(404).json({ error: 'Task not found' })
      const allowed = ['kanbanStatus', 'done', 'dependsOnAssembly', 'assignee', 'note', 'name', 'assemblyCode', 'startDate', 'endDate', 'dependsOn', 'assignedTo', 'notes', 'pct', 'departments']
      allowed.forEach(k => {
        if (req.body[k] !== undefined) task[k] = req.body[k]
      })
      // 'status' from the department kanban board — maps to kanbanStatus + done
      if (req.body.status !== undefined) {
        const s = req.body.status
        task.kanbanStatus = s === 'in-progress' ? 'inprogress' : s
        task.done = s === 'done'
      }
      // keep pct in sync with kanbanStatus whenever either changes
      if (req.body.kanbanStatus !== undefined || req.body.status !== undefined) {
        if (task.kanbanStatus === 'done')            { task.pct = 100; task.done = true  }
        else if (task.kanbanStatus === 'inprogress') { task.pct = 50;  task.done = false }
        else                                         { task.pct = 0;   task.done = false }
      }
      writeData('jobs.json', data)
      res.json(task)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // DELETE /api/jobs/:id
  router.delete('/jobs/:id', async (req, res) => {
    try {
      const data = readData('jobs.json')
      const job = data.jobs.find(j => j.id === req.params.id)
      if (!job) return res.status(404).json({ error: 'Job not found' })

      // Clean up uploaded task files from disk before removing the record.
      // The task schema is recursive (t.children) — walk all descendants, not
      // just the first level. Pre-migration jobs may still have t.subTasks on
      // disk; accept either field defensively.
      // A missing file must not block the delete, so each unlink is wrapped individually.
      function walkTasks(tasks) {
        const out = []
        for (const t of tasks || []) {
          out.push(t)
          const kids = t.children || t.subTasks || []
          if (kids.length) out.push(...walkTasks(kids))
        }
        return out
      }
      const allTasks = walkTasks(job.tasks)
      for (const task of allTasks) {
        for (const f of (task.files || [])) {
          const filePath = nodePath.join(uploadsDir, nodePath.basename(f.url || ''))
          try { await fs.promises.unlink(filePath) } catch { /* already gone */ }
        }
      }

      data.jobs = data.jobs.filter(j => j.id !== req.params.id)
      writeData('jobs.json', data)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
