import { Router } from 'express'

export default function zkRouter(readData, writeData, { getDeviceStatus, pullHistoricalLogs, getDeviceUsers, getZkInstance, resetConnection }) {
  const router = Router()

  router.get('/zk/status', async (req, res) => {
    try {
      const status = await getDeviceStatus()
      res.json(status)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // POST because it causes a side effect (writes data)
  router.post('/zk/pull', async (req, res) => {
    try {
      const result = await pullHistoricalLogs()
      res.json(result)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.get('/zk/users', async (req, res) => {
    try {
      const users = await getDeviceUsers()
      res.json({ users })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // List fingerprint templates on device — diagnostic only
  router.get('/zk/templates', async (req, res) => {
    try {
      const { zk, connected } = getZkInstance()
      if (!zk || !connected) return res.status(503).json({ error: 'ZK not connected' })
      const { data: templates } = await zk.getTemplates()
      res.json({ count: templates.length, templates: templates.map(t => ({ uid: t.uid, finger: t.finger, size: t.template?.length ?? 0 })) })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Link a ZK userId to an FMS employee
  // Body: { employeeId: "E001", zkUserId: "3" }
  router.post('/zk/enroll', (req, res) => {
    try {
      const { employeeId, zkUserId } = req.body
      if (!employeeId || !zkUserId) return res.status(400).json({ error: 'employeeId and zkUserId are required' })
      const employees = readData('employees.json')
      const idx = employees.findIndex(e => e.id === employeeId)
      if (idx === -1) return res.status(404).json({ error: 'Employee not found' })
      employees[idx].zkUserId = String(zkUserId)
      writeData('employees.json', employees)
      res.json(employees[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Force-reset the ZK socket then immediately re-check device status
  router.post('/zk/reconnect', async (req, res) => {
    try {
      await resetConnection()
      const status = await getDeviceStatus()
      res.json({ ok: true, ...status })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
