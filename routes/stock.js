import { Router } from 'express'
import multer from 'multer'

const memUpload = multer({ storage: multer.memoryStorage() })

const CODE_ALIASES    = ['Product Code','ProductCode','product_code','Code','code','Item_Code','ItemCode']
const DESC_ALIASES    = ['Product Description','ProductDescription','product_description','Description','description','Item_Description','ItemDescription','Name','name']
const QTY_ALIASES     = ['Qty On Hand','QtyOnHand','qty_on_hand','Quantity','quantity','Qty','qty','OnHand','on_hand','StockOnHand']
const UNIT_ALIASES    = ['UnitOfMeasure','unit_of_measure','Unit','unit','UOM','uom']
const COST_ALIASES    = ['Avg Cost','AverageLandedCost','average_landed_cost','UnitCost','unit_cost','Cost','cost','AvgCost','avg_cost','LastCost','last_cost']
const CAT_ALIASES     = ['ProductGroup','product_group','Category','category','Group','group','Type','type']
const LOC_ALIASES     = ['Warehouse','WarehouseCode','warehouse_code','warehouse','Location','location']
const REORDER_ALIASES = ['MinimumLevel','minimum_level','ReorderLevel','reorder_level','MinStock','min_stock','MinQty','min_qty']

function pickCol(headers, aliases) {
  return aliases.find(a => headers.includes(a)) || null
}

function computeStatus(qty, reorderLevel) {
  if (qty <= 0) return 'out'
  if (reorderLevel > 0 && qty <= reorderLevel) return 'low'
  return 'ok'
}

export default function stockRouter(readData, writeData) {
  const router = Router()

  router.get('/stock', (req, res) => {
    try { res.json(readData('stock.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/stock/import-csv', memUpload.single('file'), (req, res) => {
    console.log('[import-csv] hit, req.file:', req.file ? req.file.originalname : 'MISSING')
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

      let rows, headers
      try {
        const text = req.file.buffer.toString('latin1')
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (!lines.length) return res.status(400).json({ error: 'CSV file is empty.' })

        const KNOWN = ['product code', 'productcode', 'code', 'item_code', 'itemcode']
        let headerIdx = 0
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, '').toLowerCase())
          if (KNOWN.some(k => cells.includes(k))) { headerIdx = i; break }
        }

        headers = lines[headerIdx].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        console.log('[import-csv] detected headers:', headers)
        const dataLines = lines.slice(headerIdx + 1).filter(l => l.trim())
        if (!dataLines.length) return res.status(400).json({ error: 'No data rows found after header.' })

        rows = dataLines.map(line => {
          const cells = []
          let cur = '', inQ = false
          for (const ch of line) {
            if (ch === '"') { inQ = !inQ }
            else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = '' }
            else cur += ch
          }
          cells.push(cur.trim())
          const obj = {}
          headers.forEach((h, i) => { obj[h] = cells[i] ?? '' })
          return obj
        })
      } catch (e) {
        return res.status(400).json({ error: `CSV parse error: ${e.message}` })
      }

      const codeCol = pickCol(headers, CODE_ALIASES)
      if (!codeCol) return res.status(400).json({ error: 'No product code column found. Expected: ProductCode, Code, or similar.' })

      const descCol   = pickCol(headers, DESC_ALIASES)
      const qtyCol    = pickCol(headers, QTY_ALIASES)
      const unitCol   = pickCol(headers, UNIT_ALIASES)
      const costCol   = pickCol(headers, COST_ALIASES)
      const catCol    = pickCol(headers, CAT_ALIASES)
      const locCol    = pickCol(headers, LOC_ALIASES)
      const reorderCol = pickCol(headers, REORDER_ALIASES)

      const stock = readData('stock.json')
      const now = new Date().toISOString()
      let created = 0
      let updated = 0

      for (const row of rows) {
        const code = row[codeCol]?.trim()
        if (!code) continue

        const qty         = qtyCol    ? (parseFloat(row[qtyCol])    || 0) : 0
        const csvReorder  = reorderCol ? (parseFloat(row[reorderCol]) || 0) : 0

        const existingIdx = stock.findIndex(
          s => s.id?.toLowerCase() === code.toLowerCase() ||
               s.code?.toLowerCase() === code.toLowerCase()
        )

        if (existingIdx !== -1) {
          const existing = stock[existingIdx]
          const reorderLevel = csvReorder > 0 ? csvReorder : (existing.reorderLevel ?? existing.min ?? 0)
          stock[existingIdx] = {
            ...existing,
            qty,
            ...(costCol  ? { unitCost:      parseFloat(row[costCol])   || 0                  } : {}),
            ...(locCol   ? { location:      row[locCol]?.trim()   || existing.location   } : {}),
            ...(catCol   ? { category:      row[catCol]?.trim()   || existing.category   } : {}),
            ...(unitCol  ? { unit:          row[unitCol]?.trim()  || existing.unit        } : {}),
            reorderLevel,
            status: computeStatus(qty, reorderLevel),
            updatedAt: now,
            importedAt: now,
          }
          updated++
        } else {
          const reorderLevel = csvReorder
          const newItem = {
            id:          `S${String(stock.length + 1).padStart(3, '0')}`,
            code,
            name:        descCol  ? (row[descCol]?.trim()  || code) : code,
            category:    catCol   ? (row[catCol]?.trim()   || '')   : '',
            unit:        unitCol  ? (row[unitCol]?.trim()  || 'EA') : 'EA',
            qty,
            unitCost:    costCol  ? (parseFloat(row[costCol]) || 0) : 0,
            location:    locCol   ? (row[locCol]?.trim()   || '')   : '',
            reorderLevel,
            status: computeStatus(qty, reorderLevel),
            updatedAt: now,
            importedAt: now,
          }
          stock.push(newItem)
          created++
        }
      }

      writeData('stock.json', stock)
      res.json({ ok: true, created, updated, total: stock.length })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
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

  router.patch('/stock/:id/qty', (req, res) => {
    try {
      const stock = readData('stock.json')
      const idx = stock.findIndex(s => s.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Stock item not found' })
      const { delta, note } = req.body
      if (typeof delta !== 'number') return res.status(400).json({ error: 'delta must be a number' })
      const item = stock[idx]
      item.qty = Math.max(0, (item.qty || 0) + delta)
      if (note) item.lastNote = note
      item.updatedAt = new Date().toISOString()
      const reorderLevel = item.reorderLevel ?? item.min ?? 0
      item.status = computeStatus(item.qty, reorderLevel)
      writeData('stock.json', stock)
      res.json(item)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
