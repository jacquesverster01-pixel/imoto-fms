import { useState } from 'react'
import { useGet, apiFetch, BASE } from '../../hooks/useApi'
import { todayStr, fmtDateShort, nowSAST } from '../../utils/time'
import { styles } from '../../utils/hrStyles'
import LeaveCalendarPicker from './LeaveCalendarPicker'

const LEAVE_TYPES = ['Annual', 'Sick', 'Family Responsibility', 'Unpaid']
const LEAVE_LIMITS = { Annual: 15, Sick: 30, 'Family Responsibility': 3, Unpaid: null }
const LEAVE_COLORS = { Annual: '#6c63ff', Sick: '#ef4444', 'Family Responsibility': '#f59e0b', Unpaid: '#9ca3af' }

function countWeekdays(startDate, endDate) {
  let count = 0
  const cur = new Date(startDate + 'T12:00:00Z')
  const end = new Date(endDate + 'T12:00:00Z')
  while (cur <= end) {
    const day = cur.getUTCDay()
    if (day !== 0 && day !== 6) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return count
}

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

function checkMonFriWarning(employeeId, startDate, endDate, leaveRecords) {
  const windowEnd = new Date(endDate + 'T12:00:00Z')
  const windowStart = new Date(windowEnd)
  windowStart.setUTCDate(windowStart.getUTCDate() - 20)
  const sickRecords = leaveRecords.filter(r =>
    r.employeeId === employeeId && r.type === 'Sick' && r.status !== 'rejected'
  )
  const monFriDays = new Set()
  for (const r of sickRecords) {
    for (const d of leaveDays(r)) {
      const dt = new Date(d + 'T12:00:00Z')
      if (dt >= windowStart && dt <= windowEnd) {
        const dow = dt.getUTCDay()
        if (dow === 1 || dow === 5) monFriDays.add(d)
      }
    }
  }
  const cur = new Date(startDate + 'T12:00:00Z')
  const curEnd = new Date(endDate + 'T12:00:00Z')
  while (cur <= curEnd) {
    const dt = cur
    if (dt >= windowStart && dt <= windowEnd) {
      const dow = dt.getUTCDay()
      if (dow === 1 || dow === 5) monFriDays.add(dt.toISOString().slice(0, 10))
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return monFriDays.size
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

export default function AddLeaveModal({ employee, employees, leaveRecords, onClose, onSaved }) {
  const initEmp = employee || employees[0] || null
  const [employeeId, setEmployeeId] = useState(initEmp?.id || '')
  const [leaveType, setLeaveType] = useState('Annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [pendingFiles, setPendingFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [calYear, setCalYear] = useState(() => nowSAST().getUTCFullYear())
  const [calMonth, setCalMonth] = useState(() => nowSAST().getUTCMonth())
  const [hoverDate, setHoverDate] = useState('')

  const { data: tlData } = useGet('/timelog')
  const timelog = Array.isArray(tlData) ? tlData : []
  const { data: settingsData } = useGet('/settings')
  const leaveLimits = { ...LEAVE_LIMITS, ...(settingsData?.leaveLimits || {}) }

  const selectedEmp = employees.find(e => e.id === employeeId) || null
  const balances = selectedEmp ? calcBalances(employeeId, leaveRecords, 0, leaveLimits) : null
  const currentBal = balances ? balances[leaveType] : null
  const limit = leaveLimits[leaveType] ?? null
  const days = startDate && endDate && endDate >= startDate ? countWeekdays(startDate, endDate) : 0
  const wouldExceed = limit !== null && currentBal && days > currentBal.remaining

  const monFriCount = startDate && endDate && leaveType === 'Sick'
    ? checkMonFriWarning(employeeId, startDate, endDate, leaveRecords)
    : 0

  function handleDayClick(dateStr) {
    const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay()
    if (dow === 0 || dow === 6) return
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr)
      setEndDate('')
    } else {
      if (dateStr < startDate) {
        setStartDate(dateStr)
        setEndDate('')
      } else {
        setEndDate(dateStr)
      }
    }
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  async function handleSave() {
    if (!employeeId || !startDate || !endDate || days <= 0) return
    setSaving(true)
    try {
      const emp = employees.find(e => e.id === employeeId)
      const record = await apiFetch('/leave', {
        method: 'POST',
        body: JSON.stringify({ employeeId, type: leaveType, startDate, endDate, reason, employeeName: emp?.name || '', days, status: 'pending' })
      })
      for (const file of pendingFiles) {
        const fd = new FormData()
        fd.append('file', file)
        await fetch(`${BASE}/leave/${record.id}/upload`, { method: 'POST', body: fd })
      }
      onSaved()
    } catch (err) {
      console.error('Save leave failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const empPunchDates = new Set(
    timelog.filter(e => e.employeeId === employeeId).map(e => fmtDateShort(e.timestamp)).filter(Boolean)
  )
  const today = todayStr()

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={styles.modalTitle}>New Leave Request</h3>

        {!employee && (
          <>
            <label style={styles.label}>Employee</label>
            <select style={styles.input} value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </>
        )}
        {employee && (
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: '#1e1f3b' }}>{employee.name}</div>
        )}

        <label style={styles.label}>Leave Type</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {LEAVE_TYPES.map(t => {
            const active = leaveType === t
            const col = LEAVE_COLORS[t]
            const bal = balances?.[t]
            const exhausted = bal && leaveLimits[t] != null && bal.remaining === 0
            return (
              <button
                key={t}
                onClick={() => !exhausted && setLeaveType(t)}
                disabled={exhausted}
                title={exhausted ? `No ${t} days remaining` : undefined}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: exhausted ? 'not-allowed' : 'pointer',
                  border: `1.5px solid ${active ? col : '#e4e6ea'}`,
                  background: active ? col + '18' : '#fff',
                  color: active ? col : exhausted ? '#ccc' : '#888',
                  opacity: exhausted ? 0.55 : 1,
                }}
              >
                {t}{bal && leaveLimits[t] != null ? ` (${bal.remaining}d)` : ''}
              </button>
            )
          })}
        </div>

        {currentBal && (
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            Balance: <strong style={{ color: currentBal.remaining === 0 ? '#dc2626' : '#1e1f3b' }}>
              {limit !== null ? `${currentBal.remaining} of ${limit} days remaining` : `${currentBal.used} days taken`}
            </strong>
          </div>
        )}

        <label style={styles.label}>Select dates — click start then end</label>
        <LeaveCalendarPicker
          calYear={calYear}
          calMonth={calMonth}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          startDate={startDate}
          endDate={endDate}
          hoverDate={hoverDate}
          setHoverDate={setHoverDate}
          handleDayClick={handleDayClick}
          employeeId={employeeId}
          leaveRecords={leaveRecords}
          empPunchDates={empPunchDates}
          today={today}
        />

        <div style={{ background: wouldExceed ? '#fff3f3' : '#f5f3ff', border: `1px solid ${wouldExceed ? '#fca5a5' : '#d8d4ff'}`, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, visibility: days > 0 ? 'visible' : 'hidden' }}>
          <strong>{days} working day{days !== 1 ? 's' : ''}</strong>
          {' '}{startDate} → {endDate}
          {wouldExceed && <div style={{ color: '#dc2626', marginTop: 4 }}>⚠ Insufficient balance</div>}
          {monFriCount >= 2 && (
            <div style={{ color: '#d97706', marginTop: 4 }}>⚠ {monFriCount} Monday/Friday sick days in the last 3 weeks</div>
          )}
        </div>

        <label style={styles.label}>Reason (optional)</label>
        <textarea
          style={{ ...styles.input, resize: 'vertical', minHeight: 60 }}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Brief reason…"
        />

        <label style={styles.label}>Supporting documents (optional)</label>
        <div
          style={{ border: '2px dashed #e4e6ea', borderRadius: 8, padding: '14px 10px', textAlign: 'center', marginBottom: 12, cursor: 'pointer', fontSize: 12, color: '#aaa' }}
          onClick={() => document.getElementById('leave-file-input').click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); setPendingFiles(f => [...f, ...Array.from(e.dataTransfer.files)]) }}
        >
          {pendingFiles.length === 0
            ? 'Click or drag files here (sick notes, etc.)'
            : pendingFiles.map((f, i) => <div key={i} style={{ color: '#6c63ff' }}>{f.name}</div>)
          }
        </div>
        <input id="leave-file-input" type="file" multiple style={{ display: 'none' }} onChange={e => setPendingFiles(f => [...f, ...Array.from(e.target.files)])} />

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button
            style={{ ...styles.btnPrimary, opacity: (!startDate || !endDate || days <= 0 || wouldExceed) ? 0.5 : 1 }}
            onClick={handleSave}
            disabled={saving || !startDate || !endDate || days <= 0 || wouldExceed}
          >{saving ? 'Saving…' : 'Submit Request'}</button>
        </div>
      </div>
    </div>
  )
}
