import { useGet } from '../hooks/useApi'

// ── helpers ────────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  'on-track': { label: 'On track',  color: '#16a34a', bg: '#e8f8f0', bar: '#6c63ff' },
  'at-risk':  { label: 'At risk',   color: '#b45309', bg: '#fffbeb', bar: '#f59e0b' },
  'blocked':  { label: 'Blocked',   color: '#dc2626', bg: '#fef2f2', bar: '#ef4444' },
  'planned':  { label: 'Planned',   color: '#9298c4', bg: '#f4f5f7', bar: '#9298c4' },
}

// Window of dates shown in Gantt header
const WINDOW_START = new Date('2026-03-23')
const WINDOW_DAYS  = 7
const DAY_NAMES_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
  const d = new Date(WINDOW_START)
  d.setUTCDate(d.getUTCDate() + i)
  return `${DAY_NAMES_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES_SHORT[d.getUTCMonth()]}`
})

const WINDOW_END = new Date(WINDOW_START)
WINDOW_END.setDate(WINDOW_END.getDate() + WINDOW_DAYS)

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// Returns { start%, width% } for the Gantt bar within the visible window
function ganttBar(job) {
  const jStart = new Date(job.start)
  const jEnd   = new Date(job.due)
  const total  = WINDOW_END - WINDOW_START

  const barStart = clamp((jStart - WINDOW_START) / total, 0, 1) * 100
  const barEnd   = clamp((jEnd   - WINDOW_START) / total, 0, 1) * 100
  return { startPct: barStart, widthPct: barEnd - barStart }
}

function fmtDue(iso) {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTH_NAMES_SHORT[d.getUTCMonth()]}`
}

const alerts = [
  { type: 'red',   text: '2 electricians absent — electrical jobs at risk' },
  { type: 'red',   text: 'Angle grinder #4 needs repair — in use on Job 003' },
  { type: 'amber', text: 'Conduit stock low — SANDF Comms may be delayed' },
  { type: 'amber', text: 'Peter van Wyk leave approved — w/c 30 Mar' },
  { type: 'blue',  text: 'Thabo Nkosi First Aid cert expires in 12 days' },
]

const sideAlerts = [
  { dot: '#ef4444', text: '2 electricians absent — City of CT at risk',          tag: 'Staff · High'   },
  { dot: '#ef4444', text: 'Angle grinder #4 flagged for repair',                 tag: 'Tools · High'   },
  { dot: '#f59e0b', text: 'Conduit stock below minimum — 3 days to reorder',     tag: 'Stock · Medium' },
  { dot: '#f59e0b', text: 'Peter van Wyk leave 30–31 Mar — check Job 002',       tag: 'HR · Medium'    },
  { dot: '#6c63ff', text: 'Thabo Nkosi First Aid cert expires in 12 days',       tag: 'H&S · Low'      },
]

const staffByTrade = [
  { trade: 'Electrical',    on: 2, total: 4 },
  { trade: 'Welding',       on: 3, total: 3 },
  { trade: 'Assembly',      on: 3, total: 3 },
  { trade: 'Cabinet making',on: 3, total: 4 },
  { trade: 'Plumbing',      on: 2, total: 2 },
]

const chipColors = {
  red:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' },
  amber: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  blue:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
}

function staffBarColor(on, total) {
  const pct = on / total
  if (pct < 0.6) return '#ef4444'
  if (pct < 0.8) return '#f59e0b'
  return '#22c55e'
}

// ── component ──────────────────────────────────────────────────────────────────

export default function Production() {
  const { data: jobs, loading, error } = useGet('/jobs')

  if (loading) return <div className="p-6 text-sm" style={{ color: '#9298c4' }}>Loading production data…</div>
  if (error)   return <div className="p-6 text-sm" style={{ color: '#ef4444' }}>Failed to load jobs: {error}</div>

  // Derived metrics from real data
  const activeJobs  = jobs.filter(j => j.status !== 'planned').length
  const onTrack     = jobs.filter(j => j.status === 'on-track').length
  const atRisk      = jobs.filter(j => j.status === 'at-risk' || j.status === 'blocked').length

  const metrics = [
    { label: 'Active jobs',   value: String(activeJobs), sub: `${onTrack} on track · ${atRisk} at risk`,  color: null },
    { label: 'Staff on site', value: '11',               sub: '3 absent · 4 on leave', extra: '/18',      color: null },
    { label: 'Tools overdue', value: '4',                sub: '1 needs repair',                            color: '#ef4444' },
    { label: 'Stock alerts',  value: '2',                sub: 'Blocking 1 job',                            color: '#f59e0b' },
  ]

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl p-3 border" style={{ borderColor: '#e4e6ea' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#9298c4' }}>{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color || '#1a1d3b', lineHeight: 1 }}>
              {m.value}
              {m.extra && <span className="text-sm font-normal" style={{ color: '#b0b5cc' }}>{m.extra}</span>}
            </div>
            <div className="text-xs mt-1" style={{ color: '#b0b5cc' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Alert strip */}
      <div className="flex flex-wrap gap-2 mb-4">
        {alerts.map((a, i) => {
          const c = chipColors[a.type]
          return (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
              style={{ background: c.bg, color: c.text, borderColor: c.border }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
              {a.text}
            </div>
          )
        })}
      </div>

      {/* Main layout */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 272px' }}>

        {/* Gantt */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e4e6ea' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#f0f2f5' }}>
            <span className="font-semibold text-xs" style={{ color: '#1a1d3b' }}>Production schedule — March 2026</span>
            <div className="flex gap-1 ml-auto">
              {['Week', 'Month', 'Quarter'].map((v, i) => (
                <button key={v} className="px-2.5 py-1 rounded text-xs font-medium border"
                  style={{
                    background:   i === 0 ? '#6c63ff15' : 'transparent',
                    color:        i === 0 ? '#6c63ff'   : '#9298c4',
                    borderColor:  i === 0 ? '#6c63ff30' : 'transparent',
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: '#fafbff' }}>
                  <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider border-b"
                    style={{ color: '#9298c4', borderColor: '#f0f2f5', minWidth: 200 }}>Job</th>
                  <th className="text-left px-2 py-2 text-xs font-medium uppercase tracking-wider border-b"
                    style={{ color: '#9298c4', borderColor: '#f0f2f5', minWidth: 80 }}>Trades</th>
                  <th className="px-3 py-2 border-b" style={{ borderColor: '#f0f2f5', minWidth: 340 }}>
                    <div className="grid text-xs" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)`, color: '#b0b5cc' }}>
                      {days.map(d => <span key={d}>{d}</span>)}
                    </div>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider border-b"
                    style={{ color: '#9298c4', borderColor: '#f0f2f5', minWidth: 80 }}>Status</th>
                  <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider border-b"
                    style={{ color: '#9298c4', borderColor: '#f0f2f5', minWidth: 70 }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const s = STATUS_MAP[job.status] || STATUS_MAP['planned']
                  const { startPct, widthPct } = ganttBar(job)
                  const tradesStr = Array.isArray(job.trades) ? job.trades.join(', ') : job.trades

                  return (
                    <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#f7f8fa' }}>

                      {/* Job name + flags */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <div className="w-0.5 h-8 rounded-full mt-0.5 flex-shrink-0" style={{ background: s.bar }} />
                          <div>
                            <div className="text-xs font-medium" style={{ color: '#1a1d3b' }}>{job.name}</div>
                            <div className="text-xs" style={{ color: '#b0b5cc' }}>{job.client}</div>
                            {job.flags.map((f, fi) => (
                              <div key={fi} className="flex items-center gap-1 mt-0.5" style={{ color: '#dc2626', fontSize: 10 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                {f}
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Trades */}
                      <td className="px-2 py-2.5 text-xs" style={{ color: '#9298c4' }}>{tradesStr}</td>

                      {/* Gantt bar */}
                      <td className="px-3 py-2.5">
                        <div className="relative h-6 rounded" style={{ background: '#f7f8fa' }}>
                          {job.status === 'planned' ? (
                            <div className="absolute inset-0 rounded flex items-center px-2.5"
                              style={{ border: '1.5px dashed #d1d5db' }}>
                              <span className="text-xs" style={{ color: '#b0b5cc' }}>Starts {fmtDue(job.start)}</span>
                            </div>
                          ) : job.status === 'blocked' ? (
                            <div className="absolute top-0 bottom-0 rounded flex items-center px-2.5"
                              style={{
                                left: `${startPct}%`,
                                width: `${Math.max(widthPct, 8)}%`,
                                border: `1.5px dashed ${s.bar}`,
                                background: `${s.bar}15`,
                              }} />
                          ) : (
                            <>
                              <div className="absolute top-0 h-full rounded flex items-center px-2"
                                style={{
                                  left: `${startPct}%`,
                                  width: `${(widthPct * job.pct) / 100}%`,
                                  background: s.bar,
                                }}>
                                <span className="text-xs font-semibold text-white">{job.pct}%</span>
                              </div>
                              <div className="absolute top-0 h-full rounded-r"
                                style={{
                                  left: `${startPct + (widthPct * job.pct) / 100}%`,
                                  width: `${widthPct * (1 - job.pct / 100)}%`,
                                  background: `${s.bar}22`,
                                }} />
                            </>
                          )}
                        </div>
                        <div className="flex justify-between mt-0.5" style={{ fontSize: 9, color: '#b0b5cc' }}>
                          <span>{job.status === 'planned' ? 'Planned' : job.status === 'blocked' ? 'Blocked' : 'Started'}</span>
                          <span>Due {fmtDue(job.due)}</span>
                        </div>
                      </td>

                      {/* Status pill */}
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>

                      {/* Due date */}
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: '#9298c4' }}>
                        {fmtDue(job.due)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">

          {/* Alerts */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e4e6ea' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: '#1a1d3b' }}>Production alerts</span>
              <span className="text-xs cursor-pointer" style={{ color: '#6c63ff' }}>View all</span>
            </div>
            {sideAlerts.map((a, i) => (
              <div key={i} className="flex gap-2 py-2 border-b last:border-0" style={{ borderColor: '#f4f5f7' }}>
                <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: a.dot }} />
                <div>
                  <div className="text-xs leading-snug" style={{ color: '#4a4f7a' }}>{a.text}</div>
                  <div style={{ fontSize: 10, color: '#b0b5cc', marginTop: 1 }}>{a.tag}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Staff availability */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e4e6ea' }}>
            <div className="text-xs font-semibold mb-3" style={{ color: '#1a1d3b' }}>Staff availability today</div>
            {staffByTrade.map(t => {
              const color = staffBarColor(t.on, t.total)
              const pct = Math.round((t.on / t.total) * 100)
              return (
                <div key={t.trade} className="mb-3 last:mb-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: '#4a4f7a' }}>{t.trade}</span>
                    <span className="text-xs font-semibold" style={{ color }}>{t.on}/{t.total} on site</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#f0f2f5' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}