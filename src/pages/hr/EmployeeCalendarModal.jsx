import { useState, useEffect } from 'react'
import { useGet, BASE } from '../../hooks/useApi'
import { nowSAST, todayStr, fmtDateShort, isLate } from '../../utils/time'
import { styles } from '../../utils/hrStyles'
import EmployeeCalendarGrid from './EmployeeCalendarGrid'

const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LEAVE_TYPES = ['Annual', 'Sick', 'Family Responsibility', 'Unpaid']
const LEAVE_LIMITS = { Annual: 15, Sick: 30, 'Family Responsibility': 3, Unpaid: null }

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

export default function EmployeeCalendarModal({ emp, timelog, leave: leaveProp, onClose }) {
  const now = nowSAST()
  const [calYear, setCalYear] = useState(now.getUTCFullYear())
  const [calMonth, setCalMonth] = useState(now.getUTCMonth())
  const [excusedRecords, setExcusedRecords] = useState([])
  const [leaveRecords, setLeaveRecords] = useState(leaveProp)
  const [confirmCell, setConfirmCell] = useState(null)
  const [excusing, setExcusing] = useState(false)

  const { data: settingsData } = useGet('/settings')
  const leaveLimits = { ...LEAVE_LIMITS, ...(settingsData?.leaveLimits || {}) }
  const empExcused = excusedRecords.filter(r => r.employeeId === emp.id)

  useEffect(() => {
    fetch(`${BASE}/excused`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setExcusedRecords(d) })
      .catch(() => {})
    fetch(`${BASE}/leave`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLeaveRecords(d) })
      .catch(() => {})
  }, [])

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const today = todayStr()
  const daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate()
  const firstDow = new Date(Date.UTC(calYear, calMonth, 1)).getUTCDay()
  const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`

  const monthEntries = timelog.filter(e =>
    e.employeeId === emp.id && e.timestamp?.startsWith(monthPrefix)
  )
  const empLeave = leaveRecords.filter(l => l.employeeId === emp.id && l.status === 'approved')

  async function handleExcuse(type) {
    setExcusing(true)
    try {
      const res = await fetch(`${BASE}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: emp.id, employeeName: emp.name, type,
          startDate: confirmCell.dateStr, endDate: confirmCell.dateStr,
          days: 1, status: 'approved', source: 'calendar',
        }),
      })
      if (res.ok) {
        const newRecord = await res.json()
        setLeaveRecords(prev => [...prev, newRecord])
      }
    } finally {
      setExcusing(false)
      setConfirmCell(null)
    }
  }

  async function handleRemoveExcused() {
    if (!confirmCell?.excusedRecord) return
    setExcusing(true)
    try {
      const res = await fetch(`${BASE}/excused/${confirmCell.excusedRecord.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
      if (res.ok) setExcusedRecords(prev => prev.filter(r => r.id !== confirmCell.excusedRecord.id))
    } finally {
      setExcusing(false)
      setConfirmCell(null)
    }
  }

  async function handleRemoveLeave() {
    if (!confirmCell?.leaveRecord) return
    setExcusing(true)
    try {
      const res = await fetch(`${BASE}/leave/${confirmCell.leaveRecord.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
      if (res.ok) setLeaveRecords(prev => prev.filter(r => r.id !== confirmCell.leaveRecord.id))
    } finally {
      setExcusing(false)
      setConfirmCell(null)
    }
  }

  function getDayData(dateStr) {
    const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay()
    const isWeekend = dow === 0 || dow === 6
    const isFuture = dateStr > today
    const leaveRecord = empLeave.find(l => l.startDate <= dateStr && l.endDate >= dateStr) || null
    const excusedRecord = empExcused.find(r => r.date === dateStr) || null
    const dayEntries = monthEntries
      .filter(e => fmtDateShort(e.timestamp) === dateStr)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const shifts = []
    let pending = null
    for (const e of dayEntries) {
      if (e.type === 'in') {
        if (pending) shifts.push({ in: pending, out: null })
        pending = e
      } else if (e.type === 'out' && pending) {
        shifts.push({ in: pending, out: e })
        pending = null
      }
    }
    if (pending) shifts.push({ in: pending, out: null })
    const totalHours = shifts.reduce((sum, s) => {
      if (!s.out) return sum
      return sum + (new Date(s.out.timestamp) - new Date(s.in.timestamp)) / 3600000
    }, 0)
    const firstIn = dayEntries.find(e => e.type === 'in') || null
    const late = firstIn ? isLate(firstIn.timestamp) : false
    const overtime = totalHours > 8
    let status
    if (isWeekend) status = 'weekend'
    else if (leaveRecord) status = 'leave'
    else if (isFuture) status = 'future'
    else if (shifts.length > 0) status = 'present'
    else if (excusedRecord) status = 'excused'
    else status = 'absent'
    return { status, leaveRecord, excusedRecord, shifts, totalHours, late, overtime, isWeekend, isFuture }
  }

  let mHours = 0, mAbsent = 0, mLate = 0, mOT = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${monthPrefix}-${String(d).padStart(2, '0')}`
    if (ds > today) continue
    const data = getDayData(ds)
    mHours += data.totalHours
    if (data.status === 'absent') mAbsent++
    if (data.late) mLate++
    if (data.overtime) mOT++
  }

  const pendingLeave = leaveRecords.filter(l => l.employeeId === emp.id && l.status === 'pending')
  const excuseBalances = calcBalances(emp.id, leaveRecords, 0, leaveLimits)

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: 700, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: emp.color || '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e1f3b' }}>{emp.name}</div>
            {emp.dept && <div style={{ fontSize: 12, color: '#888' }}>{emp.dept}</div>}
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1, padding: '4px 8px' }}>✕</button>
        </div>

        {pendingLeave.length > 0 && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#c2410c', fontWeight: 600 }}>
            ⚠ {pendingLeave.length} pending leave request{pendingLeave.length > 1 ? 's' : ''} awaiting approval
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f0f2f5', color: '#555' }}>{mHours.toFixed(1)}h worked</span>
          {mAbsent > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#fee2e2', color: '#dc2626' }}>{mAbsent} absent</span>}
          {mLate > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#fef9c3', color: '#854d0e' }}>{mLate} late</span>}
          {mOT > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f5f3ff', color: '#6c63ff' }}>{mOT} overtime</span>}
        </div>

        {confirmCell && confirmCell.action === 'excuse' && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#1e1f3b', marginRight: 4 }}>
              Excuse <strong>{confirmCell.dateStr}</strong> as:
            </span>
            {[
              { type: 'Sick', label: 'Sick Leave', color: '#dc2626', bg: '#fee2e2' },
              { type: 'Family Responsibility', label: 'Family Resp.', color: '#d97706', bg: '#fef3c7' },
              { type: 'Annual', label: 'Paid Leave', color: '#6c63ff', bg: '#f5f3ff' },
            ].map(({ type, label, color, bg }) => {
              const bal = excuseBalances[type]
              const exhausted = bal && leaveLimits[type] !== null && leaveLimits[type] !== undefined && bal.remaining === 0
              return (
                <button
                  key={type}
                  onClick={() => !exhausted && !excusing && handleExcuse(type)}
                  disabled={excusing || exhausted}
                  title={exhausted ? `No ${type} days remaining` : undefined}
                  style={{ ...styles.btnSmall, background: exhausted ? '#f0f2f5' : bg, color: exhausted ? '#bbb' : color, padding: '5px 12px', cursor: exhausted ? 'not-allowed' : 'pointer', opacity: exhausted ? 0.6 : 1 }}
                >
                  {excusing ? '…' : `${label}${bal && leaveLimits[type] != null ? ` (${bal.remaining}d)` : ''}`}
                </button>
              )
            })}
            <button onClick={() => setConfirmCell(null)} style={{ ...styles.btnSmall, background: '#f3f4f6', color: '#555', padding: '5px 14px', marginLeft: 'auto' }}>Cancel</button>
          </div>
        )}
        {confirmCell && (confirmCell.action === 'remove-excused' || confirmCell.action === 'remove-leave') && (
          <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, flex: 1, color: '#1e1f3b' }}>
              {confirmCell.action === 'remove-excused'
                ? <>Remove excuse for <strong>{confirmCell.dateStr}</strong>? This day will show as absent again.</>
                : <>Remove <strong>{confirmCell.leaveRecord.type}</strong> for <strong>{confirmCell.dateStr}</strong>? This day will show as absent again.</>
              }
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={confirmCell.action === 'remove-excused' ? handleRemoveExcused : handleRemoveLeave} disabled={excusing} style={{ ...styles.btnSmall, background: '#dc2626', color: '#fff', padding: '5px 14px' }}>{excusing ? '…' : 'Confirm'}</button>
              <button onClick={() => setConfirmCell(null)} style={{ ...styles.btnSmall, background: '#f3f4f6', color: '#555', padding: '5px 14px' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={prevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#555', padding: '4px 8px' }}>◀</button>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{CAL_MONTHS[calMonth]} {calYear}</span>
          <button onClick={nextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#555', padding: '4px 8px' }}>▶</button>
        </div>

        <EmployeeCalendarGrid
          firstDow={firstDow}
          daysInMonth={daysInMonth}
          monthPrefix={monthPrefix}
          today={today}
          getDayData={getDayData}
          setConfirmCell={setConfirmCell}
        />
      </div>
    </div>
  )
}
