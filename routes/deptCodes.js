import { Router } from 'express'

const FILE = 'dept_codes.json'
const CODE_REGEX = /^([A-Z]{3})([A-Z])\d{4,6}$/

function extractPrefixes(bomsData) {
  const boms = Array.isArray(bomsData?.boms) ? bomsData.boms : []
  const set = new Set()
  for (const bom of boms) {
    const items = Array.isArray(bom?.items) ? bom.items : []
    for (const item of items) {
      const code = item?.itemCode
      if (typeof code !== 'string') continue
      const m = code.match(CODE_REGEX)
      if (m) set.add(m[1])
    }
  }
  return Array.from(set).sort()
}

export default function deptCodesRouter(readData, writeData) {
  const router = Router()

  router.get('/discovered-prefixes', (req, res) => {
    try {
      const codes = readData(FILE)
      const boms = readData('boms.json')
      const discovered = extractPrefixes(boms)
      const mappedPrefixes = new Set((codes?.prefixMappings || []).map(p => p.prefix))
      const mapped = discovered.filter(p => mappedPrefixes.has(p))
      const unmapped = discovered.filter(p => !mappedPrefixes.has(p))
      res.json({ discovered, mapped, unmapped })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get('/', (req, res) => {
    try {
      const data = readData(FILE)
      res.json({
        prefixMappings: Array.isArray(data?.prefixMappings) ? data.prefixMappings : [],
        assemblyPhases: Array.isArray(data?.assemblyPhases) ? data.assemblyPhases : []
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.put('/', (req, res) => {
    try {
      const { prefixMappings, assemblyPhases } = req.body || {}
      if (!Array.isArray(prefixMappings) || !Array.isArray(assemblyPhases)) {
        return res.status(400).json({ error: 'prefixMappings and assemblyPhases must be arrays' })
      }
      const saved = { prefixMappings, assemblyPhases }
      writeData(FILE, saved)
      res.json(saved)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
