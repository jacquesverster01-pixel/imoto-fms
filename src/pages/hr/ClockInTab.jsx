import { useState, useEffect } from 'react'
import { useGet, apiFetch } from '../../hooks/useApi'
import { todayStr, monthStr, fmtTime, isLate, fmtDateShort, nowSAST } from '../../utils/time'
import { styles } from '../../utils/hrStyles'
import EmployeeCalendarModal from './EmployeeCalendarModal'

// ─── ClockIn helpers ──────────────────────────────────────────────────────────

function getEmployeeStatus(empId, timelog) {
  const today = todayStr()
  const todayEntries = timelog
    .filter(e => e.employeeId === empId && fmtDateShort(e.timestamp) === today)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const last = todayEntries[todayEntries.length - 1]
  if (!last) return { status: 'out', clockedInAt: null, lastIn: null }
  if (last.type === 'in') return { status: 'in', clockedInAt: last.timestamp, lastIn: last.timestamp }
  const lastIn = [...todayEntries].reverse().find(e => e.type === 'in')
  return { status: 'out', clockedInAt: null, lastIn: lastIn?.timestamp || null }
}

function getLastClockIn(empId, timelog) {
  const entries = timelog
    .filter(e => e.employeeId === empId && e.type === 'in')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return entries[0]?.timestamp || null
}

function getMonthlyStats(empId, timelog, leave, excused) {
  const prefix = monthStr()
  const entries = timelog.filter(e => e.employeeId === empId && e.timestamp?.startsWith(prefix))
  const today = nowSAST()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  let workDays = 0
  for (let d = 1; d <= today.getUTCDate(); d++) {
    const day = new Date(Date.UTC(year, month, d)).getUTCDay()
    if (day !== 0 && day !== 6) workDays++
  }
  const presentDays = new Set(
    entries.filter(e => e.type === 'in').map(e => fmtDateShort(e.timestamp))
  ).size
  const approvedLeaveDays = (leave || []).filter(l =>
    l.employeeId === empId && l.status === 'approved' &&
    l.startDate?.startsWith(prefix)
  ).length
  const excusedDays = (excused || []).filter(r =>
    r.employeeId === empId && r.date?.startsWith(prefix)
  ).length
  const absentDays = Math.max(0, workDays - presentDays - approvedLeaveDays - excusedDays)
  const dayFirstIn = {}
  for (const e of entries.filter(e => e.type === 'in')) {
    const day = fmtDateShort(e.timestamp)
    if (!dayFirstIn[day] || new Date(e.timestamp) < new Date(dayFirstIn[day])) {
      dayFirstIn[day] = e.timestamp
    }
  }
  const lateDays = Object.values(dayFirstIn).filter(isLate).length
  const leaveByType = {}
  for (const type of ['Annual', 'Sick', 'Family Responsibility']) {
    leaveByType[type] = (leave || []).filter(l =>
      l.employeeId === empId && l.status === 'approved' &&
      l.type === type && l.startDate?.startsWith(prefix)
    ).reduce((sum, l) => sum + (l.days || 0), 0)
  }
  return { absentDays, lateDays, leaveByType }
}

function getLeaveInfo(empId, leave) {
  const today = todayStr()
  const pending = (leave || []).filter(l => l.employeeId === empId && l.status === 'pending')
  const upcoming = (leave || []).filter(l =>
    l.employeeId === empId && l.status === 'approved' && l.startDate >= today
  )
  return { pending, upcoming }
}

// EmployeeCalendarModal → ./EmployeeCalendarModal.jsx

// ─── ClockInTab ───────────────────────────────────────────────────────────────

export default function ClockInTab({ employees, settingsData }) {
  const { data: tlData, refetch: refreshTimelog } = useGet('/timelog')
  const { data: leaveData, refetch: refetchLeave } = useGet('/leave')
  const { data: excusedData, refetch: refetchExcused } = useGet('/excused')

  const timelog = Array.isArray(tlData) ? tlData : []
  const leave = Array.isArray(leaveData) ? leaveData : []
  const excused = Array.isArray(excusedData) ? excusedData : []

  const [, setTick] = useState(0)
  const [search, setSearch] = useState('')
  const [filterFlag, setFilterFlag] = useState('all')
  const [selectedEmp, setSelectedEmp] = useState(null)

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1)
      refreshTimelog()
    }, 30000)
    return () => clearInterval(id)
  }, [])

  async function handleClock(emp, type) {
    try {
      await apiFetch('/timelog', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: emp.id,
          name: emp.name,
          dept: emp.dept,
          type,
          timestamp: new Date().toISOString()
        })
      })
      refreshTimelog()
    } catch (err) {
      console.error('Clock event failed:', err)
    }
  }

  function resolveStatus(empId) {
    const today = todayStr()
    const onLeaveToday = leave.some(l =>
      l.employeeId === empId &&
      l.status === 'approved' &&
      l.startDate <= today &&
      l.endDate >= today
    )
    const { status, clockedInAt } = getEmployeeStatus(empId, timelog)
    if (onLeaveToday && status === 'out') return { status: 'leave', clockedInAt: null }
    return { status, clockedInAt }
  }

  const filtered = employees.filter(emp => {
    const q = search.toLowerCase()
    const nameMatch = emp.name.toLowerCase().includes(q)
    const deptMatch = (emp.dept || '').toLowerCase().includes(q)
    if (!nameMatch && !deptMatch) return false
    if (filterFlag === 'all') return true
    const { absentDays, lateDays } = getMonthlyStats(emp.id, timelog, leave, excused)
    if (filterFlag === 'late') return lateDays > 0
    if (filterFlag === 'absent') return absentDays > 0
    return true
  }).sort((a, b) => {
    if (filterFlag === 'late' || filterFlag === 'absent') {
      const sa = getMonthlyStats(a.id, timelog, leave, excused)
      const sb = getMonthlyStats(b.id, timelog, leave, excused)
      return filterFlag === 'late'
        ? sb.lateDays - sa.lateDays
        : sb.absentDays - sa.absentDays
    }
    return 0
  })

  const FILTER_OPTS = [
    { key: 'all',    label: 'All' },
    { key: 'late',   label: 'Has late days' },
    { key: 'absent', label: 'Has absences' },
  ]

  return (
    <div>
      {selectedEmp && (
        <EmployeeCalendarModal
          emp={selectedEmp}
          timelog={timelog}
          leave={leave}
          onClose={() => { setSelectedEmp(null); refetchExcused(); refetchLeave() }}
        />
      )}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...styles.input, marginBottom: 0, width: 220 }}
          placeholder="Search name or department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 0, border: '1px solid #e4e6ea', borderRadius: 8, overflow: 'hidden' }}>
          {FILTER_OPTS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilterFlag(opt.key)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: filterFlag === opt.key ? '#6c63ff' : '#fff',
                color: filterFlag === opt.key ? '#fff' : '#555'
              }}
            >{opt.label}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>
          {filtered.length} of {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(emp => {
          const { status, clockedInAt } = resolveStatus(emp.id)
          const lastClockIn = getLastClockIn(emp.id, timelog)
          const { absentDays, lateDays, leaveByType } = getMonthlyStats(emp.id, timelog, leave, excused)
          const { pending: pendingLeave, upcoming: upcomingLeave } = getLeaveInfo(emp.id, leave)
          const isIn = status === 'in'

          let durationLabel = null
          if (isIn && clockedInAt) {
            const totalMins = Math.floor((Date.now() - new Date(clockedInAt).getTime()) / 60000)
            const hrs = Math.floor(totalMins / 60)
            const mins = totalMins % 60
            durationLabel = hrs > 0 ? `${hrs}h ${mins}m ago` : `${mins}m ago`
          }

          let statusBg, statusColor, statusLabel
          if (status === 'in') {
            statusBg = '#dcfce7'; statusColor = '#15803d'; statusLabel = 'In'
          } else if (status === 'leave') {
            statusBg = '#dbeafe'; statusColor = '#1d4ed8'; statusLabel = 'On Leave'
          } else {
            statusBg = '#f1f5f9'; statusColor = '#64748b'; statusLabel = 'Out'
          }

          return (
            <div key={emp.id} onClick={() => setSelectedEmp(emp)} style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: emp.color || '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                    {emp.dept && (
                      <span style={{ display: 'inline-block', marginTop: 2, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: (emp.color || '#6c63ff') + '25', color: emp.color || '#6c63ff' }}>{emp.dept}</span>
                    )}
                  </div>
                </div>
                <span style={{ flexShrink: 0, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusBg, color: statusColor }}>{statusLabel}</span>
              </div>

              <div style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ fontWeight: 600 }}>Last clock-in: </span>
                {lastClockIn ? `${fmtTime(lastClockIn)} · ${fmtDateShort(lastClockIn)}` : 'No record'}
              </div>

              {durationLabel && (
                <div style={{ fontSize: 12, color: '#15803d', background: '#f0fdf4', borderRadius: 6, padding: '4px 8px', fontWeight: 600 }}>
                  Clocked in {durationLabel}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {absentDays > 0 ? (
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#dc2626' }}>{absentDays} absent</span>
                ) : (
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#94a3b8' }}>—</span>
                )}
                {lateDays > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fef9c3', color: '#854d0e' }}>{lateDays} late</span>
                )}
                {leaveByType['Annual'] > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#ede9fe', color: '#6c63ff' }}>{leaveByType['Annual']}d annual</span>
                )}
                {leaveByType['Sick'] > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#ef4444' }}>{leaveByType['Sick']}d sick</span>
                )}
                {leaveByType['Family Responsibility'] > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>{leaveByType['Family Responsibility']}d family</span>
                )}
              </div>

              {(pendingLeave.length > 0 || upcomingLeave.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {pendingLeave.length > 0 && (
                    <span style={{ alignSelf: 'flex-start', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fff7ed', color: '#c2410c' }}>Pending leave</span>
                  )}
                  {upcomingLeave.map(l => (
                    <span key={l.id} style={{ alignSelf: 'flex-start', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                      {l.type} from {l.startDate}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={e => { e.stopPropagation(); handleClock(emp, isIn ? 'out' : 'in') }}
                style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#fff', background: isIn ? '#ef4444' : '#22c55e', marginTop: 2 }}
              >
                {isIn ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#ccc', fontSize: 14 }}>
            {employees.length === 0 ? 'No employees yet' : 'No employees match your search'}
          </div>
        )}
      </div>
    </div>
  )
}
