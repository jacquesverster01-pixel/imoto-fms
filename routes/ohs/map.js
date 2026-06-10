import { Router } from 'express'

// OHS site map: zones (ohs_zones.json) + map assets (ohs_map_assets.json)
export default function mapRouter(readData, writeData) {
  const router = Router()

  router.get('/ohs-zones', (req, res) => {
    try { res.json(readData('ohs_zones.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-zones', (req, res) => {
    try { writeData('ohs_zones.json', req.body); res.json(req.body) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.get('/ohs-map-assets', (req, res) => {
    try { res.json(readData('ohs_map_assets.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-map-assets', (req, res) => {
    try { writeData('ohs_map_assets.json', req.body); res.json(req.body) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-map-assets/:id', (req, res) => {
    try {
      const data = readData('ohs_map_assets.json')
      const assets = Array.isArray(data.assets) ? data.assets : []
      const idx = assets.findIndex(a => a.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Asset not found' })
      assets[idx] = { ...assets[idx], ...req.body }
      writeData('ohs_map_assets.json', { assets })
      res.json(assets[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-map-assets/:id', (req, res) => {
    try {
      const data = readData('ohs_map_assets.json')
      const assets = (Array.isArray(data.assets) ? data.assets : []).filter(a => a.id !== req.params.id)
      writeData('ohs_map_assets.json', { assets })
      res.json({ id: req.params.id })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
