import { Router } from 'express'
import { createHmac } from 'crypto'

const router   = Router()
const API_ID   = process.env.UNLEASHED_API_ID    || ''
const API_KEY  = process.env.UNLEASHED_API_SECRET || ''
const BASE_URL     = 'https://api.unleashedsoftware.com'
const CLIENT_TYPE  = 'imoto/fms'

function sign(qs) {
  return createHmac('sha256', API_KEY).update(qs).digest('base64')
}

async function unleashedGet(endpoint, query = {}) {
  if (!API_ID || !API_KEY) {
    throw new Error('UNLEASHED_API_ID / UNLEASHED_API_SECRET not configured in .env')
  }
  const qs  = new URLSearchParams(query).toString()
  const url = `${BASE_URL}/${endpoint}${qs ? '?' + qs : ''}`
  const res = await fetch(url, {
    headers: {
      'Content-Type':       'application/json',
      'Accept':             'application/json',
      'api-auth-id':        API_ID,
      'api-auth-signature': sign(qs),
      'client-type':        CLIENT_TYPE,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Unleashed ${endpoint} ${res.status}: ${body}`)
  }
  return res.json()
}

async function fetchAllPages(endpoint, query = {}, itemsKey = 'Items') {
  let page = 1
  let all  = []
  while (true) {
    const data  = await unleashedGet(endpoint, { ...query, pageSize: 200, page })
    const items = data[itemsKey] || []
    all  = all.concat(items)
    if (items.length < 200) break
    page++
  }
  return all
}

router.get('/stock-on-hand', async (req, res) => {
  try {
    const query = { isAssembled: 'true' }
    if (req.query.warehouse)     query.warehouseCode  = req.query.warehouse
    if (req.query.productCode)   query.productCode    = req.query.productCode
    if (req.query.modifiedSince) query.modifiedSince  = req.query.modifiedSince
    const items = await fetchAllPages('StockOnHand', query, 'Items')
    res.json({ ok: true, items })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

router.get('/products', async (req, res) => {
  try {
    const query = { includeObsolete: req.query.obsolete === 'true' ? 'true' : 'false' }
    if (req.query.productCode)  query.productCode  = req.query.productCode
    if (req.query.productGroup) query.productGroup = req.query.productGroup
    const items = await fetchAllPages('Products', query, 'Items')
    res.json({ ok: true, items })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

router.get('/bom', async (req, res) => {
  try {
    const query = { includeObsolete: req.query.includeObsolete || 'false' }
    if (req.query.productGuid) query.productGuid = req.query.productGuid
    const items = await fetchAllPages('BillOfMaterials', query, 'Items')
    res.json({ ok: true, items })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

router.get('/assemblies', async (req, res) => {
  try {
    const query = {}
    if (req.query.status)      query.assemblyStatus = req.query.status
    if (req.query.productCode) query.productCode    = req.query.productCode
    const items = await fetchAllPages('Assemblies', query, 'Items')
    res.json({ ok: true, items })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

router.get('/warehouses', async (req, res) => {
  try {
    const items = await fetchAllPages('Warehouses', {}, 'Items')
    res.json({ ok: true, items })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

export default router
