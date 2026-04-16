import { Router } from 'express'

export default function dashboardRouter(readData) {
  const router = Router()

  router.get('/dashboard', (req, res) => {
    try {
      const now      = new Date(Date.now() + 2 * 60 * 60 * 1000) // SAST
      const todayStr = now.toISOString().slice(0, 10)
      const monthStr = now.toISOString().slice(0, 7)
      const in14     = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const employees      = readData('employees.json')
      const timelog        = readData('timelog.json')
      const leave          = readData('leave.json')
      const jobs           = readData('jobs.json')
      const tools          = readData('tools.json')
      const stock          = readData('stock.json')
      const ohs            = readData('ohs.json')
      const ohsRisks       = readData('ohs_risks.json')
      const ohsEquipment   = readData('ohs_equipment.json')
      const ohsInspections = readData('ohs_inspections_active.json')

      function toHHMM(isoStr) {
        const sast = new Date(new Date(isoStr).getTime() + 2 * 60 * 60 * 1000)
        return `${String(sast.getUTCHours()).padStart(2, '0')}:${String(sast.getUTCMinutes()).padStart(2, '0')}`
      }
      function toSASTDate(isoStr) {
        return new Date(new Date(isoStr).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
      }

      // ── HR KPIs ──────────────────────────────────────────────
      const todayLog = timelog.filter(e => e.timestamp && toSASTDate(e.timestamp) === todayStr)
      const empEventsToday = {}
      for (const e of todayLog) {
        if (!empEventsToday[e.employeeId]) empEventsToday[e.employeeId] = []
        empEventsToday[e.employeeId].push(e)
      }
      const clockedInCount = Object.values(empEventsToday).filter(evts => {
        const sorted = evts.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        return sorted[sorted.length - 1].type === 'in'
      }).length
      const lateArrivalCount = Object.values(empEventsToday).filter(evts => {
        const firstIn = evts.filter(e => e.type === 'in').sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0]
        if (!firstIn) return false
        const sast = new Date(new Date(firstIn.timestamp).getTime() + 2 * 60 * 60 * 1000)
        return sast.getUTCHours() > 8 || (sast.getUTCHours() === 8 && sast.getUTCMinutes() > 0)
      }).length
      const onLeaveToday = leave.filter(l =>
        l.status === 'approved' && l.startDate <= todayStr && l.endDate >= todayStr
      ).length

      // ── PRODUCTION ──────────────────────────────────────────
      const activeJobs         = jobs.filter(j => j.status !== 'complete' && j.status !== 'cancelled')
      const overdueJobs        = activeJobs.filter(j => j.due && j.due < todayStr).length
      const completedThisMonth = jobs.filter(j =>
        j.status === 'complete' && j.completedDate && j.completedDate.startsWith(monthStr)
      ).length

      // ── OHS ─────────────────────────────────────────────────
      const openIncidents      = ohs.filter(i => (i.status || '').toLowerCase() !== 'closed').length
      const overdueInspections = ohsInspections.filter(i =>
        i.status !== 'completed' && (i.dueDate || i.scheduledDate) &&
        (i.dueDate || i.scheduledDate) < todayStr
      ).length
      const overdueReviews      = ohsRisks.filter(r => r.reviewStatus === 'overdue').length
      const equipmentServiceDue = ohsEquipment.filter(eq =>
        eq.nextServiceDate && eq.nextServiceDate <= in14
      ).length

      // ── STOCK ───────────────────────────────────────────────
      const lowStockItems = stock.filter(s => {
        const qty     = s.quantity ?? s.qty ?? 0
        const reorder = s.reorderLevel ?? s.min ?? 5
        return qty <= reorder
      })

      // ── TOOLS ───────────────────────────────────────────────
      const overdueCount = tools.filter(t =>
        t.status === 'overdue' || (t.nextServiceDate && t.nextServiceDate < todayStr)
      ).length
      const missingCount = tools.filter(t => t.status === 'missing').length

      // ── EMPLOYEE STATUS ──────────────────────────────────────
      const employeeStatus = employees.map(emp => {
        const onLeave = leave.find(l =>
          l.status === 'approved' && l.employeeId === emp.id &&
          l.startDate <= todayStr && l.endDate >= todayStr
        )
        if (onLeave) {
          return { id: emp.id, name: emp.name, department: emp.dept || emp.department || '', status: 'leave', clockInTime: null, clockOutTime: null, leaveType: onLeave.type || null }
        }
        const evts    = (empEventsToday[emp.id] || []).slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        const lastIn  = [...evts].reverse().find(e => e.type === 'in')
        const lastOut = [...evts].reverse().find(e => e.type === 'out')
        if (!lastIn) {
          return { id: emp.id, name: emp.name, department: emp.dept || emp.department || '', status: 'out', clockInTime: null, clockOutTime: null, leaveType: null }
        }
        const clockInSAST = new Date(new Date(lastIn.timestamp).getTime() + 2 * 60 * 60 * 1000)
        const isLate      = clockInSAST.getUTCHours() > 8 || (clockInSAST.getUTCHours() === 8 && clockInSAST.getUTCMinutes() > 0)
        const hasOut      = lastOut && lastOut.timestamp > lastIn.timestamp
        const status      = hasOut ? 'out' : isLate ? 'late' : 'in'
        return {
          id: emp.id, name: emp.name, department: emp.dept || emp.department || '',
          status, clockInTime: toHHMM(lastIn.timestamp),
          clockOutTime: hasOut ? toHHMM(lastOut.timestamp) : null,
          leaveType: null,
        }
      })

      res.json({
        hr:             { clockedInCount, lateArrivalCount, onLeaveToday, totalEmployees: employees.length },
        production:     { activeJobs: activeJobs.length, overdueJobs, completedThisMonth, jobs },
        ohs:            { openIncidents, overdueInspections, overdueReviews, equipmentServiceDue },
        stock:          { lowStockCount: lowStockItems.length, lowStockItems: lowStockItems.map(s => ({ id: s.id, name: s.name, quantity: s.quantity ?? s.qty ?? 0, reorderLevel: s.reorderLevel ?? s.min ?? 5 })) },
        tools:          { overdueCount, missingCount },
        employeeStatus,
      })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
