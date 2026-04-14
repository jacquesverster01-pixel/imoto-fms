import { useState } from 'react'
import { useGet } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'
import EditShiftModal from './EditShiftModal'
import ExportModal from './ExportModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function FingerprintIcon({ title = 'Biometric scan' }) {
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
        <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
        <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
        <path d="M2 12a10 10 0 0 1 18-6"/>
        <path d="M2 17.5a14.5 14.5 0 0 0 4.27 6"/>
        <path d="M22 12a10 10 0 0 1-1.18 4.6"/>
        <path d="M5 19.5C5.81 21 7 22 9 22"/>
        <path d="M6 12a6 6 0 0 1 11.17-3"/>
      </svg>
    </span>
  )
}

function buildShifts(logs) {
  const byEmp = {}
  logs.forEach(e => {
    if (!byEmp[e.employeeId]) byEmp[e.employeeId] = []
    byEmp[e.employeeId].push(e)
  })

  const shifts = []
  Object.values(byEmp).forEach(empLogs => {
    const sorted = [...empLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    let pending = null
    sorted.forEach(e => {
      if (e.type === 'in') {
        if (pending) shifts.push({ ...pending, outTimestamp: null, outId: null, outSource: null })
        pending = { employeeId: e.employeeId, name: e.name, dept: e.dept, inTimestamp: e.timestamp, inId: e.id, inSource: e.source }
      } else if (e.type === 'out' && pending) {
        shifts.push({ ...pending, outTimestamp: e.timestamp, outId: e.id, outSource: e.source })
        pending = null
      }
    })
    if (pending) shifts.push({ ...pending, outTimestamp: null, outId: null, outSource: null })
  })

  return shifts.sort((a, b) => new Date(b.inTimestamp) - new Date(a.inTimestamp))
}

// EditShiftModal → ./EditShiftModal.jsx
// ExportModal    → ./ExportModal.jsx

// ─── TimeLogTab ───────────────────────────────────────────────────────────────

export default function TimeLogTab({ employees }) {
  const { data: tlData, refetch: refreshTimelog } = useGet('/timelog')
  const timelog = Array.isArray(tlData) ? tlData : []

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [editShift, setEditShift] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const { data: settingsData } = useGet('/settings')
  const otTiers = (settingsData?.overtime?.tiers || []).sort((a, b) => a.hoursOver - b.hoursOver)

  function getOtInfo(hours) {
    if (!hours || Number(hours) <= 8 || !otTiers.length) return null
    const otHours = Number(hours) - 8
    const tier = [...otTiers].reverse().find(t => otHours > t.hoursOver)
    return tier ? { otHours: otHours.toFixed(1), multiplier: tier.multiplier } : null
  }

  const allShifts = buildShifts(timelog)

  const filtered = allShifts.filter(s => {
    const nameMatch = s.name.toLowerCase().includes(search.toLowerCase())
    const dateMatch = !dateFilter || dateLabel(s.inTimestamp) === dateFilter
    let sourceMatch = true
    if (sourceFilter === 'manual') sourceMatch = !s.inSource && !s.outSource
    if (sourceFilter === 'biometric') sourceMatch = s.inSource === 'biometric' || s.outSource === 'biometric'
    return nameMatch && dateMatch && sourceMatch
  })

  const totalHours = filtered.reduce((sum, s) => {
    const h = calcHours(s.inTimestamp, s.outTimestamp)
    return h ? sum + parseFloat(h) : sum
  }, 0)

  function handleShiftSaved() {
    setEditShift(null)
    refreshTimelog()
  }

  return (
    <div>
      {editShift && (
        <EditShiftModal
          shift={editShift}
          onClose={() => setEditShift(null)}
          onSaved={handleShiftSaved}
        />
      )}
      {showExport && (
        <ExportModal
          allShifts={allShifts}
          employees={employees}
          onClose={() => setShowExport(false)}
        />
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...styles.input, marginBottom: 0, width: 200 }}
          placeholder="Search name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          type="date"
          style={{ ...styles.input, marginBottom: 0, width: 160 }}
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        />
        {dateFilter && (
          <button style={styles.btnSecondary} onClick={() => setDateFilter('')}>Clear date</button>
        )}

        <div style={{ display: 'flex', gap: 0, border: '1px solid #e4e6ea', borderRadius: 8, overflow: 'hidden', marginLeft: 4 }}>
          {['all', 'manual', 'biometric'].map(f => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: sourceFilter === f ? '#6c63ff' : '#fff',
                color: sourceFilter === f ? '#fff' : '#555',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {f === 'biometric' && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                  <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                  <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
                  <path d="M2 12a10 10 0 0 1 18-6"/>
                  <path d="M2 17.5a14.5 14.5 0 0 0 4.27 6"/>
                  <path d="M22 12a10 10 0 0 1-1.18 4.6"/>
                  <path d="M5 19.5C5.81 21 7 22 9 22"/>
                  <path d="M6 12a6 6 0 0 1 11.17-3"/>
                </svg>
              )}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <button style={{ ...styles.btnSecondary, marginLeft: 'auto' }} onClick={() => setShowExport(true)}>Export CSV</button>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <div style={styles.statPill}>{filtered.length} shifts</div>
        <div style={styles.statPill}>{totalHours.toFixed(1)} hrs total</div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fb' }}>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Dept</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Clock-in</th>
              <th style={styles.th}>Clock-out</th>
              <th style={styles.th}>Hours</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const hours = calcHours(s.inTimestamp, s.outTimestamp)
              const onShift = !s.outTimestamp
              const ot = hours ? getOtInfo(hours) : null
              return (
                <tr
                  key={s.inId || i}
                  onClick={() => setEditShift(s)}
                  style={{ borderBottom: '1px solid #f0f2f5', cursor: 'pointer', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                >
                  <td style={styles.td}>{s.name}</td>
                  <td style={styles.td}><span style={{ ...styles.pill, background: '#f0f2f5', color: '#555' }}>{s.dept}</span></td>
                  <td style={styles.td}>{dateLabel(s.inTimestamp)}</td>
                  <td style={styles.td}>
                    {isoToHHMM(s.inTimestamp)}
                    {s.inSource === 'biometric' && <FingerprintIcon title="Biometric clock-in" />}
                  </td>
                  <td style={styles.td}>
                    {onShift
                      ? <span style={{ ...styles.pill, background: '#dcfce7', color: '#16a34a' }}>On shift</span>
                      : <>
                          {isoToHHMM(s.outTimestamp)}
                          {s.outSource === 'biometric' && <FingerprintIcon title="Biometric clock-out" />}
                        </>
                    }
                  </td>
                  <td style={styles.td}>
                    {hours
                      ? ot
                        ? <span>{hours}h <span style={{ fontSize: 10, color: '#6c63ff', fontWeight: 600 }}>({ot.otHours}h OT ×{ot.multiplier})</span></span>
                        : `${hours}h`
                      : '—'}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>No shifts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
