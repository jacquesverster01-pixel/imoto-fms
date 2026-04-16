import { Router } from 'express'

export default function toolsRouter(readData, writeData) {
  const router = Router()

  router.get('/tools', (req, res) => {
    try { res.json(readData('tools.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/tools', (req, res) => {
    try {
      const tools = readData('tools.json')
      const newTool = { ...req.body, id: `T${String(tools.length + 1).padStart(3, '0')}` }
      tools.push(newTool)
      writeData('tools.json', tools)
      res.json(newTool)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/tools/:id', (req, res) => {
    try {
      const tools = readData('tools.json')
      const idx = tools.findIndex(t => t.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Tool not found' })
      tools[idx] = { ...tools[idx], ...req.body }
      writeData('tools.json', tools)
      res.json(tools[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/tools/:id', (req, res) => {
    try {
      let tools = readData('tools.json')
      tools = tools.filter(t => t.id !== req.params.id)
      writeData('tools.json', tools)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
