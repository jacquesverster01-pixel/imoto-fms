import { useState } from 'react'
import { nowSAST, todayStr, isoToHHMM, dateLabel, calcHours } from '../../utils/time'
import { styles } from '../../utils/hrStyles'

const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

function buildDetailedRows(empList, shiftMap, fromDate, toDate) {
  const allDays = []
  const cur = new Date(fromDate + 'T00:00:00Z')
  const end = new Date(toDate   + 'T00:00:00Z')
  while (cur <= end) {
    allDays.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  const rows = []
  empList.forEach(emp => {
    allDays.forEach(day => {
      const dayShifts = shiftMap[`${emp.id}|${day}`]
      if (dayShifts?.length) {
        dayShifts
          .sort((a, b) => new Date(a.inTimestamp) - new Date(b.inTimestamp))
          .forEach(s => {
            const src = (s.inSource === 'biometric' || s.outSource === 'biometric') ? 'biometric' : 'manual'
            const h = calcHours(s.inTimestamp, s.outTimestamp)
            rows.push(`"${emp.name}","${emp.dept || ''}","${day}","${isoToHHMM(s.inTimestamp)}","${s.outTimestamp ? isoToHHMM(s.outTimestamp) : 'No clock-out'}","${h != null ? h.toFixed(1) : ''}","${src}"`)
          })
      } else {
        rows.push(`"${emp.name}","${emp.dept || ''}","${day}","No clock","No clock","",""`)
      }
    })
  })
  return rows
}

function buildSummaryRows(empList, shiftMap, fromDate, toDate) {
  const allDays = []
  const cur = new Date(fromDate + 'T00:00:00Z')
  const end = new Date(Math.min(new Date(toDate + 'T00:00:00Z'), new Date(todayStr() + 'T00:00:00Z')))
  while (cur <= end) {
    allDays.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  const rows = []
  empList.forEach(emp => {
    let daysWorked = 0, daysAbsent = 0, daysIncompl = 0, totalHours = 0
    allDays.forEach(day => {
      const dayShifts  = shiftMap[`${emp.id}|${day}`] || []
      const complete   = dayShifts.filter(s => s.outTimestamp)
      const incomplete = dayShifts.filter(s => !s.outTimestamp)
      if (complete.length > 0) {
        daysWorked++
        complete.forEach(s => { const h = calcHours(s.inTimestamp, s.outTimestamp); if (h != null) totalHours += h })
      } else if (incomplete.length > 0) {
        daysIncompl++
      } else {
        const dow = new Date(day + 'T00:00:00Z').getUTCDay()
        if (dow !== 0 && dow !== 6) daysAbsent++
      }
    })
    const paidTotal = Math.max(0, totalHours - daysWorked)
    rows.push(`"${emp.name}","${emp.dept || ''}","${daysWorked}","${daysAbsent}","${daysIncompl}","${totalHours.toFixed(1)}","${paidTotal.toFixed(1)}"`)
  })
  const meta = `"Period:","${fromDate} to ${toDate}"\n\n`
  return { rows, meta }
}

export default function ExportModal({ allShifts, employees, onClose }) {
  const now = nowSAST()
  const [reportType, setReportType] = useState('detailed')
  const [empMode, setEmpMode] = useState('all')
  const [selectedEmps, setSelectedEmps] = useState({})
  const [dateMode, setDateMode] = useState('month')
  const [calYear, setCalYear] = useState(now.getUTCFullYear())
  const [calMonth, setCalMonth] = useState(now.getUTCMonth())
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')

  const years = Array.from({ length: 4 }, (_, i) => now.getUTCFullYear() - i)
  const allSelected = employees.length > 0 && employees.every(e => selectedEmps[e.id])

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedEmps({})
    } else {
      const all = {}
      employees.forEach(e => { all[e.id] = true })
      setSelectedEmps(all)
    }
  }

  const canExport = empMode === 'all' || Object.values(selectedEmps).some(Boolean)

  function getDateBounds() {
    if (dateMode === 'month') {
      const from = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate()
      const to = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      return { from, to }
    }
    return { from: rangeFrom, to: rangeTo }
  }

  function getEmpList() {
    const list = empMode === 'select'
      ? employees.filter(e => selectedEmps[e.id])
      : [...employees]
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }

  function buildFilename(suffix) {
    let name = `timelog_${suffix}`
    if (dateMode === 'month') name += `_${calYear}-${String(calMonth + 1).padStart(2, '0')}`
    else {
      const { from, to } = getDateBounds()
      if (from || to) name += `_${from || 'start'}_to_${to || 'end'}`
    }
    return name + '.csv'
  }

  function handleExport() {
    const { from: fromDate, to: toDate } = getDateBounds()
    if (!fromDate || !toDate) return

    const empList = getEmpList()
    const empIds  = new Set(empList.map(e => e.id))
    const shiftMap = {}
    allShifts.forEach(s => {
      const d = dateLabel(s.inTimestamp)
      if (d < fromDate || d > toDate || !empIds.has(s.employeeId)) return
      const key = `${s.employeeId}|${d}`
      if (!shiftMap[key]) shiftMap[key] = []
      shiftMap[key].push(s)
    })

    if (reportType === 'detailed') {
      const rows = buildDetailedRows(empList, shiftMap, fromDate, toDate)
      downloadCsv('Employee,Department,Date,Clock-In,Clock-Out,Hours,Source\n' + rows.join('\n'), buildFilename('detailed'))
    } else {
      const { rows, meta } = buildSummaryRows(empList, shiftMap, fromDate, toDate)
      downloadCsv(meta + 'Employee,Department,Days Worked,Absent,Incomplete,Total Hours,Paid Hours\n' + rows.join('\n'), buildFilename('summary'))
    }

    onClose()
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={styles.modalTitle}>Export Time Log</h3>

        {/* Report type */}
        <label style={styles.label}>Report type</label>
        <div style={{ display: 'flex', gap: 0, border: '1px solid #e4e6ea', borderRadius: 8, overflow: 'hidden', marginBottom: 18 }}>
          {[
            { id: 'detailed', label: 'Detailed (daily)' },
            { id: 'summary',  label: 'Hours summary' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setReportType(opt.id)}
              style={{ flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: reportType === opt.id ? '#6c63ff' : '#fff',
                color:      reportType === opt.id ? '#fff'     : '#555' }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Employees */}
        <label style={styles.label}>Employees</label>
        <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={empMode === 'all'} onChange={() => setEmpMode('all')} />
            All employees
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={empMode === 'select'} onChange={() => setEmpMode('select')} />
            Select employees
          </label>
        </div>

        {empMode === 'select' && (
          <div style={{ marginBottom: 16 }}>
            <button
              style={{ ...styles.btnSecondary, fontSize: 11, padding: '3px 10px', marginBottom: 6 }}
              onClick={toggleSelectAll}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e4e6ea', borderRadius: 8 }}>
              {employees.map(emp => (
                <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={!!selectedEmps[emp.id]}
                    onChange={() => setSelectedEmps(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                  />
                  <span style={{ flex: 1 }}>{emp.name}</span>
                  {emp.dept && <span style={{ fontSize: 11, color: '#9298c4' }}>{emp.dept}</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Date range */}
        <label style={styles.label}>Date range</label>
        <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={dateMode === 'month'} onChange={() => setDateMode('month')} />
            Calendar month
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={dateMode === 'range'} onChange={() => setDateMode('range')} />
            Custom range
          </label>
        </div>

        {dateMode === 'month' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select
              style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              value={calMonth}
              onChange={e => setCalMonth(Number(e.target.value))}
            >
              {CAL_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              style={{ ...styles.input, marginBottom: 0, width: 90 }}
              value={calYear}
              onChange={e => setCalYear(Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {dateMode === 'range' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input type="date" style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} />
            <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>to</span>
            <input type="date" style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              value={rangeTo} onChange={e => setRangeTo(e.target.value)} />
          </div>
        )}

        {reportType === 'summary' && (
          <div style={{ background: '#f8f7ff', border: '1px solid #e0deff', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#555' }}>
            1h unpaid lunch deducted per day worked. Incomplete days (clock-in but no clock-out) are counted separately and excluded from hours.
          </div>
        )}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleExport} disabled={!canExport}>
            Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}
