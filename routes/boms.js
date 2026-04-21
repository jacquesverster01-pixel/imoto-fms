import { Router } from 'express'
import multer from 'multer'
import { parse } from 'csv-parse/sync'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const REQUIRED_COLUMNS = [
  'BOM_Reference', 'Product_Code', 'Product_Description', 'Level',
  'Item_Code', 'Item_Description', 'Parent_Code', 'Department',
  'Item_Type', 'Unit', 'Quantity', 'Wastage_Qty', 'Unit_Cost', 'Total_Cost',
]

export function parseBomCsv(buffer) {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true })
  if (!rows.length) throw new Error('CSV file is empty.')
  const missing = REQUIRED_COLUMNS.filter(c => !(c in rows[0]))
  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`)
  return rows.map(r => ({
    bomReference:       r.BOM_Reference,
    productCode:        r.Product_Code,
    productDescription: r.Product_Description,
    level:              parseInt(r.Level, 10) || 0,
    itemCode:           r.Item_Code,
    itemDescription:    r.Item_Description,
    parentCode:         r.Parent_Code || '',
    department:         r.Department,
    itemType:           r.Item_Type,
    unit:               r.Unit,
    quantity:           parseFloat(r.Quantity) || 0,
    wastageQty:         parseFloat(r.Wastage_Qty) || 0,
    unitCost:           parseFloat(r.Unit_Cost) || 0,
    totalCost:          parseFloat(r.Total_Cost) || 0,
  }))
}

export default function bomsRouter(readData, writeData) {
  const router = Router()

  router.get('/boms', (req, res) => {
    const { boms } = readData('boms.json')
    res.json(boms.map(({ id, productCode, productDescription, bomReference, importedAt, rowCount }) =>
      ({ id, productCode, productDescription, bomReference, importedAt, rowCount })
    ))
  })

  router.get('/boms/:id', (req, res) => {
    const { boms } = readData('boms.json')
    const bom = boms.find(b => b.id === req.params.id)
    if (!bom) return res.status(404).json({ error: 'BOM not found' })
    res.json(bom)
  })

  router.post('/boms/import', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' })
    let items
    try {
      items = parseBomCsv(req.file.buffer)
    } catch (err) {
      return res.status(400).json({ error: err.message })
    }
    if (!items.length) return res.status(400).json({ error: 'No rows parsed.' })
    const first = items[0]
    const data = readData('boms.json')
    const existing = data.boms.find(b => b.productCode === first.productCode)
    const id = existing ? existing.id : crypto.randomUUID()
    const entry = {
      id,
      productCode:        first.productCode,
      productDescription: first.productDescription,
      bomReference:       first.bomReference,
      importedAt:         new Date().toISOString(),
      rowCount:           items.length,
      items,
    }
    if (existing) {
      data.boms = data.boms.map(b => b.id === id ? entry : b)
    } else {
      data.boms.push(entry)
    }
    writeData('boms.json', data)
    res.json({ ok: true, id, productCode: entry.productCode, rowCount: entry.rowCount })
  })

  router.delete('/boms/:id', (req, res) => {
    const data = readData('boms.json')
    const before = data.boms.length
    data.boms = data.boms.filter(b => b.id !== req.params.id)
    if (data.boms.length === before) return res.status(404).json({ error: 'BOM not found' })
    writeData('boms.json', data)
    res.json({ ok: true })
  })

  return router
}
