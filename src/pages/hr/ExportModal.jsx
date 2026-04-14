import { useState } from 'react'
import { nowSAST } from '../../utils/time'
import { styles } from '../../utils/hrStyles'

const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function isoToHHMM(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  const h = String((d.getUTCHours() + 2) % 24).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function calcHours(inIso, outIso) {
  if (!inIso || !outIso) return null
  const diff = (new Date(outIso) - new Date(inIso)) / 3600000
  return diff > 0 ? diff.toFixed(1) : null
}

function dateLabel(isoStr) {
  return new Date(isoStr).toISOString().slice(0, 10)
}

export default function ExportModal({ allShifts, employees, onClose }) {
  const now = nowSAST()
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

  function handleExport() {
    let shifts = [...allShifts]

    if (empMode === 'select') {
      const ids = new Set(Object.keys(selectedEmps).filter(k => selectedEmps[k]))
      shifts = shifts.filter(s => ids.has(s.employeeId))
    }

    if (dateMode === 'month') {
      const prefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
      shifts = shifts.filter(s => dateLabel(s.inTimestamp).startsWith(prefix))
    } else {
      if (rangeFrom) shifts = shifts.filter(s => dateLabel(s.inTimestamp) >= rangeFrom)
      if (rangeTo)   shifts = shifts.filter(s => dateLabel(s.inTimestamp) <= rangeTo)
    }

    shifts.sort((a, b) => new Date(a.inTimestamp) - new Date(b.inTimestamp))

    const header = 'Employee,Department,Date,Clock-In,Clock-Out,Hours,Source\n'
    const rows = shifts.map(s => {
      const src = (s.inSource === 'biometric' || s.outSource === 'biometric') ? 'biometric' : 'manual'
      return `"${s.name}","${s.dept || ''}","${dateLabel(s.inTimestamp)}","${isoToHHMM(s.inTimestamp)}","${s.outTimestamp ? isoToHHMM(s.outTimestamp) : ''}","${calcHours(s.inTimestamp, s.outTimestamp) || ''}","${src}"`
    }).join('\n')

    let filename = 'timelog'
    if (dateMode === 'month') {
      filename += `_${calYear}-${String(calMonth + 1).padStart(2, '0')}`
    } else if (rangeFrom || rangeTo) {
      filename += `_${rangeFrom || 'start'}_to_${rangeTo || 'end'}`
    }
    filename += '.csv'

    const blob = new Blob([header + rows], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    onClose()
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={styles.modalTitle}>Export Time Log</h3>

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
            <input
              type="date"
              style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              value={rangeFrom}
              onChange={e => setRangeFrom(e.target.value)}
            />
            <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>to</span>
            <input
              type="date"
              style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              value={rangeTo}
              onChange={e => setRangeTo(e.target.value)}
            />
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
