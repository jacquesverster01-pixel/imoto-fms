import { useState } from 'react'
import { useGet, apiFetch, BASE } from '../../hooks/useApi'
import { todayStr, fmtDateShort, nowSAST } from '../../utils/time'
import { styles } from '../../utils/hrStyles'
import LeaveCalendarPicker from './LeaveCalendarPicker'
import LeaveFormFields from './LeaveFormFields'

const LEAVE_TYPES = ['Annual', 'Sick', 'Family Responsibility', 'Unpaid']
const LEAVE_LIMITS = { Annual: 15, Sick: 30, 'Family Responsibility': 3, Unpaid: null }

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
  const days = startDate && endDate && endDate >= startDate ? countWeekdays(startDate, endDate) : 0
  const limit = leaveLimits[leaveType] ?? null
  const currentBal = balances ? balances[leaveType] : null
  const wouldExceed = limit !== null && currentBal && days > currentBal.remaining
  const monFriCount = startDate && endDate && leaveType === 'Sick'
    ? checkMonFriWarning(employeeId, startDate, endDate, leaveRecords) : 0

  function handleDayClick(dateStr) {
    const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay()
    if (dow === 0 || dow === 6) return
    if (!startDate || (startDate && endDate)) { setStartDate(dateStr); setEndDate('') }
    else { if (dateStr < startDate) { setStartDate(dateStr); setEndDate('') } else setEndDate(dateStr) }
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) } else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) } else setCalMonth(m => m + 1)
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
        <LeaveFormFields
          employee={employee} employees={employees} employeeId={employeeId} setEmployeeId={setEmployeeId}
          leaveType={leaveType} setLeaveType={setLeaveType} balances={balances} leaveLimits={leaveLimits}
          startDate={startDate} endDate={endDate} days={days} wouldExceed={wouldExceed} monFriCount={monFriCount}
          reason={reason} setReason={setReason} pendingFiles={pendingFiles} setPendingFiles={setPendingFiles}
        >
          <LeaveCalendarPicker
            calYear={calYear} calMonth={calMonth} prevMonth={prevMonth} nextMonth={nextMonth}
            startDate={startDate} endDate={endDate} hoverDate={hoverDate} setHoverDate={setHoverDate}
            handleDayClick={handleDayClick} employeeId={employeeId} leaveRecords={leaveRecords}
            empPunchDates={empPunchDates} today={today}
          />
        </LeaveFormFields>
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
