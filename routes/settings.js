import { Router } from 'express'

const DEFAULT_SETTINGS = {
  company: {
    name: 'iMoto Manufacturing (Pty) Ltd', reg: '2015/123456/07',
    address: 'Montague Gardens, Cape Town, 7441', phone: '+27 21 555 0100',
    email: 'info@imoto.co.za', website: 'www.imoto.co.za'
  },
  departments: [
    { name: 'Assembly', color: '#f59e0b' },
    { name: 'Cabinet Making', color: '#ef4444' },
    { name: 'Electrical', color: '#6c63ff' },
    { name: 'General', color: '#64748b' },
    { name: 'Plumbing', color: '#b45309' },
    { name: 'Welding', color: '#22c55e' },
    { name: 'Workshop', color: '#9298c4' }
  ],
  users: [
    { name: 'Jacques Du Plessis', email: 'jacques@imoto.co.za', role: 'Admin', color: '#6c63ff', id: 'JD' }
  ],
  alerts: {
    staffConstraint: true, toolOverdue: true, stockLevel: true,
    certExpiry: true, absentImpact: true, dailySummary: false
  },
  whatsapp: {
    enabled: false, twilioSid: '', twilioToken: '', number: '', checkinTime: '08:00',
    clockinReminders: false, leaveViaWhatsapp: false, sickNotePhoto: false,
    requireNoteMonFri: false, requireNoteAfter2: false
  }
}

export default function settingsRouter(readData, writeData) {
  const router = Router()

  router.get('/settings', (req, res) => {
    try {
      let settings
      try { settings = readData('settings.json') } catch { settings = DEFAULT_SETTINGS; writeData('settings.json', settings) }
      res.json(settings)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/settings', (req, res) => {
    try {
      let current
      try { current = readData('settings.json') } catch { current = { ...DEFAULT_SETTINGS } }
      const updated = { ...current, ...req.body }
      writeData('settings.json', updated)
      res.json(updated)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.get('/settings/export', (req, res) => {
    try {
      let settingsData
      try { settingsData = readData('settings.json') } catch { settingsData = {} }
      res.json({
        employees: readData('employees.json'),
        timelog:   readData('timelog.json'),
        leave:     readData('leave.json'),
        jobs:      readData('jobs.json'),
        tools:     readData('tools.json'),
        stock:     readData('stock.json'),
        settings:  settingsData,
        exportedAt: new Date().toISOString()
      })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/settings/reset', (req, res) => {
    try {
      writeData('timelog.json', [])
      writeData('leave.json', [])
      writeData('jobs.json', [])
      writeData('tools.json', [])
      writeData('stock.json', [])
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
