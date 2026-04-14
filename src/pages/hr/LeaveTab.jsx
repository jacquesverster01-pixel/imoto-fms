import { useState } from 'react'
import { useGet, apiFetch } from '../../hooks/useApi'
import { fmtDateShort, nowSAST } from '../../utils/time'
import { styles } from '../../utils/hrStyles'
import AddLeaveModal from './AddLeaveModal'

// ─── Leave helpers ────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LEAVE_TYPES = ['Annual', 'Sick', 'Family Responsibility', 'Unpaid']
const LEAVE_LIMITS = { Annual: 15, Sick: 30, 'Family Responsibility': 3, Unpaid: null }
const LEAVE_COLORS = { Annual: '#6c63ff', Sick: '#ef4444', 'Family Responsibility': '#f59e0b', Unpaid: '#9ca3af' }

function leaveDays(record) {
  const days = []
  const cur = new Date(record.startDate + 'T12:00:00Z')
  const end = new Date(record.endDate + 'T12:00:00Z')
  while (cur <= end) {
    const dow = cur.getUTCDay()
    if (dow !== 0 && dow !== 6) days.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

function detectLeavePatterns(employeeId, leaveRecords) {
  const today = new Date()
  today.setUTCHours(12, 0, 0, 0)
  const sixWeeksAgo = new Date(today)
  sixWeeksAgo.setUTCDate(sixWeeksAgo.getUTCDate() - 41)

  const sickDays = new Set()
  leaveRecords
    .filter(r => r.employeeId === employeeId && r.type === 'Sick' && r.status !== 'rejected')
    .forEach(r => leaveDays(r).forEach(d => sickDays.add(d)))

  const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const patterns = []

  for (let dow = 1; dow <= 5; dow++) {
    const occurrences = []
    const d = new Date(today)
    while (occurrences.length < 6) {
      if (d.getUTCDay() === dow) occurrences.push(d.toISOString().slice(0, 10))
      d.setUTCDate(d.getUTCDate() - 1)
    }
    const hits = occurrences.filter(date => sickDays.has(date))
    if (hits.length >= 3) {
      patterns.push(`Sick on ${hits.length}/6 ${DOW_NAMES[dow]}s`)
    }
  }
  return patterns
}

function calcBalances(employeeId, leaveRecords, absentDays = 0, leaveLimits = LEAVE_LIMITS) {
  const approved = leaveRecords.filter(r => r.employeeId === employeeId && r.status === 'approved')
  const result = {}
  for (const type of LEAVE_TYPES) {
    const leaveUsed = approved.filter(r => r.type === type).reduce((sum, r) => sum + (r.days || 0), 0)
    const used = type === 'Unpaid' ? leaveUsed + absentDays : leaveUsed
    const limit = leaveLimits[type] ?? null
    result[type] = { used, remaining: limit !== null ? Math.max(0, limit - used) : null }
  }
  return result
}

function getYearlyAbsent(empId, timelog, leaveRecords, excusedRecords) {
  const today = nowSAST()
  const year = today.getUTCFullYear()
  const currentMonth = today.getUTCMonth()
  let totalAbsent = 0

  for (let m = 0; m <= currentMonth; m++) {
    const monthPrefix = `${year}-${String(m + 1).padStart(2, '0')}`
    const lastDay = m === currentMonth
      ? today.getUTCDate()
      : new Date(Date.UTC(year, m + 1, 0)).getUTCDate()

    let workDays = 0
    for (let d = 1; d <= lastDay; d++) {
      const dow = new Date(Date.UTC(year, m, d)).getUTCDay()
      if (dow !== 0 && dow !== 6) workDays++
    }

    const presentDays = new Set(
      timelog.filter(e => e.employeeId === empId && e.type === 'in' && e.timestamp?.startsWith(monthPrefix))
        .map(e => fmtDateShort(e.timestamp))
    ).size

    const approvedLeaveDays = (leaveRecords || []).filter(l =>
      l.employeeId === empId && l.status === 'approved' && l.startDate?.startsWith(monthPrefix)
    ).length

    const excusedDays = (excusedRecords || []).filter(r =>
      r.employeeId === empId && r.date?.startsWith(monthPrefix)
    ).length

    totalAbsent += Math.max(0, workDays - presentDays - approvedLeaveDays - excusedDays)
  }

  return totalAbsent
}

// ─── LeaveTab ─────────────────────────────────────────────────────────────────

export default function LeaveTab({ employees, settingsData }) {
  const { data: leaveData, refetch: refreshLeave } = useGet('/leave')
  const { data: tlData } = useGet('/timelog')
  const { data: excusedData } = useGet('/excused')
  const leaveRecords = Array.isArray(leaveData) ? leaveData : []
  const timelog = Array.isArray(tlData) ? tlData : []
  const excusedRecords = Array.isArray(excusedData) ? excusedData : []
  const leaveLimits = { ...LEAVE_LIMITS, ...(settingsData?.leaveLimits || {}) }

  const [addForEmployee, setAddForEmployee] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [dismissedPatterns, setDismissedPatterns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('imoto_dismissed_patterns') || '{}') }
    catch { return {} }
  })
  const [calMonth, setCalMonth] = useState(() => {
    const now = nowSAST()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  })

  function dismissPattern(key) {
    const updated = { ...dismissedPatterns, [key]: true }
    setDismissedPatterns(updated)
    localStorage.setItem('imoto_dismissed_patterns', JSON.stringify(updated))
  }

  const pending = leaveRecords.filter(r => r.status === 'pending')

  async function handleApprove(id) {
    try {
      await apiFetch(`/leave/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'approved' }) })
      refreshLeave()
    } catch (err) {
      console.error('Approve leave failed:', err)
    }
  }

  async function handleReject(id) {
    try {
      await apiFetch(`/leave/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'rejected' }) })
      refreshLeave()
    } catch (err) {
      console.error('Reject leave failed:', err)
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/leave/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      refreshLeave()
    } catch (err) {
      console.error('Delete leave failed:', err)
    }
  }

  const history = leaveRecords.filter(r => {
    const nameMatch = !search || (r.employeeName || '').toLowerCase().includes(search.toLowerCase())
    const typeMatch = typeFilter === 'all' || r.type === typeFilter
    const statusMatch = statusFilter === 'all' || r.status === statusFilter
    return nameMatch && typeMatch && statusMatch
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const [calYear, calMonthNum] = calMonth.split('-').map(Number)
  const daysInMonth = new Date(calYear, calMonthNum, 0).getDate()
  const firstDow = new Date(calYear, calMonthNum - 1, 1).getDay()
  const approvedLeave = leaveRecords.filter(r => r.status === 'approved')

  function getLeavesOnDay(dateStr) {
    return approvedLeave.filter(r => r.startDate <= dateStr && r.endDate >= dateStr)
  }

  function exportCSV() {
    const header = 'Employee,Type,Start,End,Days,Status,Reason\n'
    const rows = history.map(r =>
      `"${r.employeeName}","${r.type}","${r.startDate}","${r.endDate}","${r.days}","${r.status}","${(r.reason || '').replace(/"/g, '""')}"`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `leave_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {addForEmployee && (
        <AddLeaveModal
          employee={addForEmployee}
          employees={employees}
          leaveRecords={leaveRecords}
          onClose={() => setAddForEmployee(null)}
          onSaved={() => { setAddForEmployee(null); refreshLeave() }}
        />
      )}

      {pending.length > 0 && (
        <div style={{ ...styles.card, border: '1px solid #fde68a' }}>
          <h3 style={{ ...styles.cardTitle, marginBottom: 12 }}>
            Pending Approvals{' '}
            <span style={{ ...styles.pill, background: '#fef3c7', color: '#d97706', marginLeft: 4 }}>{pending.length}</span>
          </h3>
          {pending.map(r => {
            const emp = employees.find(e => e.id === r.employeeId)
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f2f5' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: emp?.color || '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {(r.employeeName || '').split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.employeeName}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {r.type} · {r.startDate} → {r.endDate} · {r.days}d
                    {r.reason && <span style={{ marginLeft: 6, fontStyle: 'italic' }}>"{r.reason}"</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...styles.btnSmall, background: '#dcfce7', color: '#16a34a' }} onClick={() => handleApprove(r.id)}>Approve</button>
                  <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#dc2626' }} onClick={() => handleReject(r.id)}>Reject</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={styles.card}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={styles.cardTitle}>Leave Balances</h3>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Click an employee name to add a leave request</div>
        </div>
        {employees.map(emp => {
          const bal = calcBalances(emp.id, leaveRecords, getYearlyAbsent(emp.id, timelog, leaveRecords, excusedRecords), leaveLimits)
          const patterns = detectLeavePatterns(emp.id, leaveRecords)
          const activePatterns = patterns.filter(p => !dismissedPatterns[`${emp.id}:${p}`])
          return (
            <div key={emp.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f2f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: emp.color || '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div
                  style={{ width: 160, fontWeight: 600, fontSize: 13, color: '#6c63ff', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                  onClick={() => setAddForEmployee(emp)}
                >{emp.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LEAVE_TYPES.map(type => {
                    const { used, remaining } = bal[type]
                    const lim = leaveLimits[type] ?? null
                    const color = LEAVE_COLORS[type]
                    return (
                      <span key={type} style={{ ...styles.pill, background: used === 0 ? '#f0f2f5' : `${color}20`, color: used === 0 ? '#aaa' : color, fontSize: 11 }}>
                        {type.split(' ')[0]}: {lim !== null ? `${remaining}/${lim}` : `${used}d`}
                      </span>
                    )
                  })}
                </div>
              </div>
              {activePatterns.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 40, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '4px 10px', fontSize: 11 }}>
                  <span style={{ color: '#c2410c' }}>⚠ Pattern detected: {p}</span>
                  <button onClick={() => dismissPattern(`${emp.id}:${p}`)} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#aaa', fontSize: 13, lineHeight: 1 }}>✕</button>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h3 style={styles.cardTitle}>Calendar</h3>
          <button style={{ ...styles.btnSecondary, padding: '4px 10px' }} onClick={() => {
            const d = new Date(calYear, calMonthNum - 2, 1)
            setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
          }}>◀</button>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {MONTH_NAMES[calMonthNum - 1]} {calYear}
          </span>
          <button style={{ ...styles.btnSecondary, padding: '4px 10px' }} onClick={() => {
            const d = new Date(calYear, calMonthNum, 1)
            setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
          }}>▶</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#aaa', padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${calYear}-${String(calMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const leaves = getLeavesOnDay(dateStr)
            const isWeekend = [0, 6].includes(new Date(dateStr + 'T12:00:00Z').getUTCDay())
            return (
              <div key={day} style={{ minHeight: 52, borderRadius: 6, background: isWeekend ? '#f8f9fb' : '#fff', border: '1px solid #f0f2f5', padding: '4px 5px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isWeekend ? '#ccc' : '#555', marginBottom: 2 }}>{day}</div>
                {leaves.map(r => (
                  <div key={r.id} style={{ background: (LEAVE_COLORS[r.type] || '#888') + '30', color: LEAVE_COLORS[r.type] || '#888', borderRadius: 3, padding: '1px 3px', fontSize: 9, fontWeight: 600, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(r.employeeName || '').split(' ')[0]}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ ...styles.cardTitle, marginRight: 4 }}>History</h3>
          <input style={{ ...styles.input, marginBottom: 0, width: 180 }} placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ ...styles.input, marginBottom: 0, width: 170 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={{ ...styles.input, marginBottom: 0, width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button style={{ ...styles.btnSecondary, marginLeft: 'auto' }} onClick={exportCSV}>Export CSV</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fb' }}>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>From</th>
                <th style={styles.th}>To</th>
                <th style={styles.th}>Days</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => {
                const statusColor = r.status === 'approved' ? '#16a34a' : r.status === 'rejected' ? '#dc2626' : '#d97706'
                const statusBg = r.status === 'approved' ? '#dcfce7' : r.status === 'rejected' ? '#fee2e2' : '#fef3c7'
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f2f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={styles.td}>{r.employeeName}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.pill, background: (LEAVE_COLORS[r.type] || '#888') + '20', color: LEAVE_COLORS[r.type] || '#888' }}>{r.type}</span>
                    </td>
                    <td style={styles.td}>{r.startDate}</td>
                    <td style={styles.td}>{r.endDate}</td>
                    <td style={styles.td}>{r.days}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.pill, background: statusBg, color: statusColor }}>{r.status}</span>
                    </td>
                    <td style={styles.td}><span style={{ color: '#888', fontStyle: 'italic' }}>{r.reason || '—'}</span></td>
                    <td style={styles.td}>
                      {confirmDelete === r.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#dc2626' }} onClick={() => handleDelete(r.id)}>Confirm</button>
                          <button style={{ ...styles.btnSmall, background: '#f3f4f6', color: '#888' }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button style={{ ...styles.btnSmall, background: '#f3f4f6', color: '#888' }} onClick={() => setConfirmDelete(r.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {history.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>No leave records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
