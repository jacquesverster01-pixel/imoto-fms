import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHmac } from 'crypto'
import { computeGlobalAllocations, checkTaskAllocation, checkJobAllocation } from '../src/utils/stockAllocation.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const CACHE_FILE = path.join(__dirname, '..', 'data', 'stock_cache.json')
const JOBS_FILE  = path.join(__dirname, '..', 'data', 'jobs.json')

const API_ID  = process.env.UNLEASHED_API_ID    || ''
const API_KEY = process.env.UNLEASHED_API_SECRET || ''
const BASE_URL = 'https://api.unleashedsoftware.com'

function sign(qs) {
  return createHmac('sha256', API_KEY).update(qs).digest('base64')
}

async function unleashedGet(endpoint, query = {}) {
  if (!API_ID || !API_KEY) throw new Error('UNLEASHED_API_ID / UNLEASHED_API_SECRET not configured in .env')
  const qs  = new URLSearchParams(query).toString()
  const url = `${BASE_URL}/${endpoint}${qs ? '?' + qs : ''}`
  const res = await fetch(url, {
    headers: {
      'Content-Type':       'application/json',
      'Accept':             'application/json',
      'api-auth-id':        API_ID,
      'api-auth-signature': sign(qs),
      'client-type':        'imoto/fms',
    },
  })
  if (!res.ok) { const body = await res.text(); throw new Error(`Unleashed ${endpoint} ${res.status}: ${body}`) }
  return res.json()
}

async function fetchAllPages(endpoint, query = {}) {
  let page = 1, all = []
  while (true) {
    const data  = await unleashedGet(endpoint, { ...query, pageSize: 200, page })
    const items = data.Items || []
    all = all.concat(items)
    if (items.length < 200) break
    page++
  }
  return all
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) }
  catch { return { updatedAt: null, byCode: {} } }
}

function readAllJobs() {
  try { return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8')).jobs || [] }
  catch { return [] }
}

const CACHE_TTL_MS = 60 * 60 * 1000

export async function refreshStockCache() {
  const items = await fetchAllPages('StockOnHand', {})
  const now = new Date().toISOString()
  const byCode = {}
  for (const item of items) {
    const code = item.Product?.ProductCode
    if (!code) continue
    const qty = item.AvailableQty ?? 0
    if (byCode[code]) {
      byCode[code].onHand += qty
    } else {
      byCode[code] = { onHand: qty, lastUpdated: now }
    }
  }
  const cache = { updatedAt: now, byCode }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
  console.log(`[stock-refresh] cached ${Object.keys(byCode).length} SKUs at ${now}`)
  return { ok: true, count: Object.keys(byCode).length, updatedAt: now }
}

const router = Router()

router.post('/stock/refresh', async (req, res) => {
  try {
    const result = await refreshStockCache()
    res.json(result)
  } catch (err) {
    console.error('[stock/refresh]', err.message)
    res.status(502).json({ ok: false, error: err.message })
  }
})

router.get('/stock/allocation', (req, res) => {
  const { jobId, taskId } = req.query
  if (!jobId) return res.status(400).json({ error: 'jobId is required' })

  const allJobs = readAllJobs()
  const job = allJobs.find(j => j.id === jobId)
  if (!job) return res.status(404).json({ error: 'Job not found' })

  const cache = readCache()
  const cacheAgeMs = cache.updatedAt ? Date.now() - new Date(cache.updatedAt).getTime() : Infinity
  const cacheStale = cacheAgeMs > CACHE_TTL_MS

  const globalAllocations = computeGlobalAllocations(allJobs)

  const meta = { cacheUpdatedAt: cache.updatedAt, cacheStale }

  if (taskId) {
    const task = findTaskById(job.tasks || [], taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })
    const components = checkTaskAllocation(task, cache.byCode, globalAllocations)
    const summary = {
      ok:      components.filter(c => c.status === 'ok').length,
      short:   components.filter(c => c.status === 'short').length,
      unknown: components.filter(c => c.status === 'unknown').length,
    }
    return res.json({ ok: true, ...meta, components, summary })
  }

  const byTask = checkJobAllocation(job, cache.byCode, globalAllocations)
  res.json({ ok: true, ...meta, byTask })
})

function findTaskById(tasks, id) {
  for (const task of tasks) {
    if (task.id === id) return task
    if (task.children?.length) {
      const found = findTaskById(task.children, id)
      if (found) return found
    }
  }
  return null
}

export default router
