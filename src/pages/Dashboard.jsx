import { useGet } from '../hooks/useApi'
import { todayStr } from '../utils/time'

const CARD = { background: '#fff', border: '1px solid #e4e6ea', borderRadius: 14, padding: '24px 28px' }

function jobStatusStyle(status) {
  if (status === 'on-track') return { bg: '#e8f8f0', text: '#16a34a' }
  if (status === 'at-risk')  return { bg: '#fffbeb', text: '#b45309' }
  if (status === 'blocked')  return { bg: '#fee2e2', text: '#dc2626' }
  if (status === 'complete') return { bg: '#ede9fe', text: '#6c63ff' }
  return { bg: '#f3f4f6', text: '#6b7280' }
}

const STATUS_CFG = {
  in:    { bg: '#16a34a', text: '#fff', label: 'IN' },
  late:  { bg: '#d97706', text: '#fff', label: 'LATE' },
  leave: { bg: '#2563eb', text: '#fff', label: 'LEAVE' },
  out:   { bg: '#9ca3af', text: '#fff', label: 'OUT' },
}

function sortKey(e) {
  if (e.status === 'late')  return 0
  if (e.status === 'in')    return 1
  if (e.status === 'leave') return 2
  if (e.status === 'out' && e.clockInTime) return 3
  return 4
}

export default function Dashboard({ onNavigate }) {
  const { data: raw, refetch } = useGet('/dashboard')

  const d    = raw || {}
  const hr   = d.hr         || {}
  const prod = d.production || {}
  const ohs  = d.ohs        || {}
  const stk  = d.stock      || {}
  const tls  = d.tools      || {}
  const empStatus = Array.isArray(d.employeeStatus) ? d.employeeStatus : []

  const ganttJobs = (Array.isArray(prod.jobs) ? prod.jobs : [])
    .filter(j => j.status !== 'complete' && j.status !== 'cancelled')
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''))
    .slice(0, 8)

  const sorted = [...empStatus].sort((a, b) => sortKey(a) - sortKey(b))

  const inCount    = empStatus.filter(e => e.status === 'in').length
  const lateCount  = empStatus.filter(e => e.status === 'late').length
  const leaveCount = empStatus.filter(e => e.status === 'leave').length
  const notInCount = empStatus.filter(e => e.status === 'out' && !e.clockInTime).length

  const kpiGroups = [
    {
      title: 'HR', nav: 'employees',
      stats: [
        { label: 'Clocked in',  value: hr.clockedInCount   ?? 0, problem: false },
        { label: 'On leave',    value: hr.onLeaveToday     ?? 0, problem: false },
        { label: 'Late today',  value: hr.lateArrivalCount ?? 0, problem: true  },
      ],
    },
    {
      title: 'Production', nav: 'production',
      stats: [
        { label: 'Active jobs',     value: prod.activeJobs        ?? 0, problem: false },
        { label: 'Overdue',         value: prod.overdueJobs       ?? 0, problem: true  },
        { label: 'Done this month', value: prod.completedThisMonth ?? 0, problem: false },
      ],
    },
    {
      title: 'OHS', nav: 'health-safety',
      stats: [
        { label: 'Open incidents',  value: ohs.openIncidents       ?? 0, problem: true },
        { label: 'Overdue insp.',   value: ohs.overdueInspections  ?? 0, problem: true },
        { label: 'Reviews due',     value: ohs.overdueReviews      ?? 0, problem: true },
        { label: 'Service due',     value: ohs.equipmentServiceDue ?? 0, problem: true },
      ],
    },
    {
      title: 'Stock', nav: 'stock',
      stats: [
        { label: 'Low / out of stock', value: stk.lowStockCount ?? 0, problem: true },
      ],
    },
    {
      title: 'Tools', nav: 'tools',
      stats: [
        { label: 'Overdue', value: tls.overdueCount ?? 0, problem: true },
        { label: 'Missing', value: tls.missingCount ?? 0, problem: true },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Row 1 — KPI cards */}
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {kpiGroups.map(grp => (
            <div
              key={grp.title}
              onClick={() => onNavigate(grp.nav)}
              style={{ ...CARD, cursor: 'pointer', flex: '1 1 160px', minWidth: 160 }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,99,255,0.14)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6c63ff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                {grp.title}
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {grp.stats.map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: s.problem && s.value > 0 ? '#dc2626' : s.value === 0 ? '#cbd5e1' : '#6c63ff' }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 — Mini Gantt + OHS Snapshot */}
      <div style={{ display: 'flex', gap: 16 }}>

        {/* Mini Gantt */}
        <div style={{ ...CARD, flex: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1f3b' }}>Active Jobs</div>
            <button onClick={() => onNavigate('jobs')} style={{ fontSize: 12, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              View all →
            </button>
          </div>
          {ganttJobs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#ccc', padding: '28px 0', fontSize: 13 }}>No active jobs</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ganttJobs.map(j => {
                const sty = jobStatusStyle(j.status)
                return (
                  <div key={j.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e1f3b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                        {j.name}
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: sty.bg, color: sty.text }}>{j.status}</span>
                        {j.due && <span style={{ fontSize: 11, color: '#888' }}>Due {j.due}</span>}
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#f0f2f5', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${j.pct || 0}%`, background: sty.text, borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* OHS Snapshot */}
        <div style={{ ...CARD, flex: 1, minWidth: 210 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1f3b' }}>OHS Snapshot</div>
            <button onClick={() => onNavigate('health-safety')} style={{ fontSize: 12, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              View OHS →
            </button>
          </div>
          {[
            { label: 'Open incidents',  value: ohs.openIncidents      ?? 0 },
            { label: 'Overdue insp.',   value: ohs.overdueInspections ?? 0 },
            { label: 'Overdue reviews', value: ohs.overdueReviews     ?? 0 },
            { label: 'Equipment due',   value: ohs.equipmentServiceDue ?? 0 },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 13, color: '#555' }}>{row.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: row.value > 0 ? '#dc2626' : '#22c55e' }}>{row.value}</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.value > 0 ? '#dc2626' : '#22c55e' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 — Employee Status List */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1f3b' }}>Factory Floor — Today</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{todayStr()}</span>
            <button onClick={refetch} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9298c4' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>
          {inCount} in · {lateCount} late · {leaveCount} on leave · {notInCount} not in
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sorted.map(emp => {
            const cfg     = STATUS_CFG[emp.status] || STATUS_CFG.out
            const greyed  = emp.status === 'out' && !emp.clockInTime
            const rowStyle = {
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 0', borderBottom: '1px solid #f3f4f6',
              opacity: greyed ? 0.4 : 1,
            }
            return (
              <div key={emp.id} style={rowStyle}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: cfg.bg, color: cfg.text, flexShrink: 0, minWidth: 48, textAlign: 'center' }}>
                  {cfg.label}{emp.status === 'leave' && emp.leaveType ? <span style={{ fontWeight: 400, fontSize: 10 }}> · {emp.leaveType}</span> : null}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e1f3b', flex: 2, minWidth: 0, fontStyle: greyed ? 'italic' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {emp.name}
                </span>
                <span style={{ fontSize: 12, color: '#6b7280', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {emp.department}
                </span>
                <span style={{ fontSize: 12, color: '#374151', flexShrink: 0, width: 48, textAlign: 'right' }}>
                  {emp.clockInTime || '—'}
                </span>
                <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0, width: 48, textAlign: 'right' }}>
                  {emp.clockOutTime || '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
