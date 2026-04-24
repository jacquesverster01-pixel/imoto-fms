import { Router } from 'express'

const FILE = 'dept_codes.json'

export default function deptCodesRouter(readData, writeData) {
  const router = Router()

  router.get('/', (req, res) => {
    try {
      const data = readData(FILE)
      res.json({
        prefixes: Array.isArray(data?.prefixes) ? data.prefixes : [],
        assemblyPhases: Array.isArray(data?.assemblyPhases) ? data.assemblyPhases : []
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.put('/', (req, res) => {
    try {
      const { prefixes, assemblyPhases } = req.body || {}
      if (!Array.isArray(prefixes) || !Array.isArray(assemblyPhases)) {
        return res.status(400).json({ error: 'prefixes and assemblyPhases must be arrays' })
      }
      const saved = { prefixes, assemblyPhases }
      writeData(FILE, saved)
      res.json(saved)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
