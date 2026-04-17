import { useState, useMemo } from 'react'
import { useGet } from '../../hooks/useApi'
import { daysAgoStr, isoToHHMM, dateLabel, calcHours } from '../../utils/time'
import { styles } from '../../utils/hrStyles'
import EditShiftModal from './EditShiftModal'
import ExportModal from './ExportModal'
import DeleteRangeModal from './DeleteRangeModal'


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
    // Group by UTC date so bio-override filter runs per day
    const byDate = {}
    empLogs.forEach(e => {
      const d = e.timestamp.slice(0, 10)
      if (!byDate[d]) byDate[d] = []
      byDate[d].push(e)
    })

    // Per day: suppress manual entries that biometric already covers
    //   - manual clock-in AFTER a bio clock-in → ignored (bio is the authoritative arrival)
    //   - manual clock-out BEFORE a bio clock-out → ignored (bio is the authoritative departure)
    const bioFiltered = []
    Object.values(byDate).forEach(dayLogs => {
      const bioInTimes  = dayLogs.filter(e => e.source === 'biometric' && e.type === 'in').map(e => e.timestamp)
      const bioOutTimes = dayLogs.filter(e => e.source === 'biometric' && e.type === 'out').map(e => e.timestamp)
      dayLogs.forEach(e => {
        if (e.source !== 'biometric') {
          if (e.type === 'in'  && bioInTimes.some(t => t <= e.timestamp))  return
          if (e.type === 'out' && bioOutTimes.some(t => t >= e.timestamp)) return
        }
        bioFiltered.push(e)
      })
    })

    const sorted = [...bioFiltered].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    let pending = null
    const empShifts = []

    sorted.forEach(e => {
      if (e.type === 'in') {
        if (pending) empShifts.push({ ...pending, outTimestamp: null, outId: null, outSource: null })
        pending = { employeeId: e.employeeId, name: e.name, dept: e.dept, inTimestamp: e.timestamp, inId: e.id, inSource: e.source }
      } else if (e.type === 'out') {
        if (pending) {
          empShifts.push({ ...pending, outTimestamp: e.timestamp, outId: e.id, outSource: e.source })
          pending = null
        }
        // orphan clock-out with no open shift — ignore
      }
    })
    if (pending) empShifts.push({ ...pending, outTimestamp: null, outId: null, outSource: null })

    // Any unclosed shift that has a later shift for this employee is a missed clock-out,
    // not an active "on shift" — regardless of whether the later entry was manual or biometric
    empShifts.forEach((s, idx) => {
      if (!s.outTimestamp && idx < empShifts.length - 1) s.missedClockOut = true
    })

    shifts.push(...empShifts)
  })

  return shifts.sort((a, b) => new Date(b.inTimestamp) - new Date(a.inTimestamp))
}

function getOtInfo(hours, otTiers) {
  if (!hours || Number(hours) <= 8 || !otTiers.length) return null
  const otHours = Number(hours) - 8
  const tier = [...otTiers].reverse().find(t => otHours > t.hoursOver)
  return tier ? { otHours: otHours.toFixed(1), multiplier: tier.multiplier } : null
}

// EditShiftModal → ./EditShiftModal.jsx
// ExportModal    → ./ExportModal.jsx

// ─── TimeLogTab ───────────────────────────────────────────────────────────────

const WINDOW_OPTIONS = [
  { label: '7d',  days: 7   },
  { label: '30d', days: 30  },
  { label: '90d', days: 90  },
  { label: 'All', days: null },
]

export default function TimeLogTab({ employees }) {
  const [fetchDays, setFetchDays] = useState(30)

  const tlPath = fetchDays ? `/timelog?from=${daysAgoStr(fetchDays)}` : '/timelog'
  const { data: tlData, refetch: refreshTimelog } = useGet(tlPath)
  const timelog = Array.isArray(tlData) ? tlData : []

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [editShift, setEditShift] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const { data: settingsData } = useGet('/settings')
  const otTiers = (settingsData?.overtime?.tiers || []).sort((a, b) => a.hoursOver - b.hoursOver)

  const allShifts = useMemo(() => buildShifts(timelog), [timelog])

  const filtered = useMemo(() => allShifts.filter(s => {
    const nameMatch = s.name.toLowerCase().includes(search.toLowerCase())
    const dateMatch = !dateFilter || dateLabel(s.inTimestamp) === dateFilter
    let sourceMatch = true
    if (sourceFilter === 'manual') sourceMatch = !s.inSource && !s.outSource
    if (sourceFilter === 'biometric') sourceMatch = s.inSource === 'biometric' || s.outSource === 'biometric'
    return nameMatch && dateMatch && sourceMatch
  }), [allShifts, search, dateFilter, sourceFilter])

  const totalHours = filtered.reduce((sum, s) => {
    const h = calcHours(s.inTimestamp, s.outTimestamp)
    return h ? sum + h : sum
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
      {showDelete && (
        <DeleteRangeModal
          timelog={timelog}
          employees={employees}
          onClose={() => setShowDelete(false)}
          onDeleted={refreshTimelog}
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

        <div style={{ display: 'flex', gap: 0, border: '1px solid #e4e6ea', borderRadius: 8, overflow: 'hidden' }}>
          {WINDOW_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => setFetchDays(opt.days)}
              style={{ padding: '6px 11px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: fetchDays === opt.days ? '#6c63ff' : '#fff',
                color: fetchDays === opt.days ? '#fff' : '#555' }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button style={styles.btnSecondary} onClick={() => setShowExport(true)}>Export CSV</button>
          <button style={{ ...styles.btnSecondary, color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => setShowDelete(true)}>Delete Range</button>
        </div>
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
              const today = new Date().toISOString().slice(0, 10)
              const onShift = !s.outTimestamp && !s.missedClockOut && dateLabel(s.inTimestamp) === today
              const ot = hours ? getOtInfo(hours, otTiers) : null
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
                      : s.outTimestamp
                        ? <>
                            {isoToHHMM(s.outTimestamp)}
                            {s.outSource === 'biometric' && <FingerprintIcon title="Biometric clock-out" />}
                          </>
                        : <span style={{ ...styles.pill, background: '#fef9ec', color: '#d97706' }}>No clock-out</span>
                    }
                  </td>
                  <td style={styles.td}>
                    {hours
                      ? ot
                        ? <span>{hours.toFixed(1)}h <span style={{ fontSize: 10, color: '#6c63ff', fontWeight: 600 }}>({ot.otHours}h OT ×{ot.multiplier})</span></span>
                        : `${hours.toFixed(1)}h`
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
