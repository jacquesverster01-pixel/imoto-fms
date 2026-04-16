import { Router } from 'express'

export default function stockRouter(readData, writeData) {
  const router = Router()

  router.get('/stock', (req, res) => {
    try { res.json(readData('stock.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/stock', (req, res) => {
    try {
      const stock = readData('stock.json')
      const newItem = { ...req.body, id: `S${String(stock.length + 1).padStart(3, '0')}` }
      stock.push(newItem)
      writeData('stock.json', stock)
      res.json(newItem)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/stock/:id', (req, res) => {
    try {
      const stock = readData('stock.json')
      const idx = stock.findIndex(s => s.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Stock item not found' })
      stock[idx] = { ...stock[idx], ...req.body }
      writeData('stock.json', stock)
      res.json(stock[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/stock/:id', (req, res) => {
    try {
      let stock = readData('stock.json')
      const exists = stock.some(s => s.id === req.params.id)
      if (!exists) return res.status(404).json({ error: 'Stock item not found' })
      stock = stock.filter(s => s.id !== req.params.id)
      writeData('stock.json', stock)
      res.json({ success: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
