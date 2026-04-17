import { useGet } from '../hooks/useApi'
import ProductionGantt from './production/ProductionGantt'
import ProductionSidebar from './production/ProductionSidebar'

const alerts = [
  { type: 'red',   text: '2 electricians absent — electrical jobs at risk' },
  { type: 'red',   text: 'Angle grinder #4 needs repair — in use on Job 003' },
  { type: 'amber', text: 'Conduit stock low — SANDF Comms may be delayed' },
  { type: 'amber', text: 'Peter van Wyk leave approved — w/c 30 Mar' },
  { type: 'blue',  text: 'Thabo Nkosi First Aid cert expires in 12 days' },
]
const chipColors = {
  red:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' },
  amber: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  blue:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
}

export default function Production() {
  const { data: jobs, loading, error } = useGet('/jobs')

  if (loading) return <div className="p-6 text-sm" style={{ color: '#9298c4' }}>Loading production data…</div>
  if (error)   return <div className="p-6 text-sm" style={{ color: '#ef4444' }}>Failed to load jobs: {error}</div>

  const activeJobs = jobs.filter(j => j.status !== 'planned').length
  const onTrack    = jobs.filter(j => j.status === 'on-track').length
  const atRisk     = jobs.filter(j => j.status === 'at-risk' || j.status === 'blocked').length

  const metrics = [
    { label: 'Active jobs',   value: String(activeJobs), sub: `${onTrack} on track · ${atRisk} at risk`, color: null },
    { label: 'Staff on site', value: '11',               sub: '3 absent · 4 on leave', extra: '/18',     color: null },
    { label: 'Tools overdue', value: '4',                sub: '1 needs repair',                           color: '#ef4444' },
    { label: 'Stock alerts',  value: '2',                sub: 'Blocking 1 job',                           color: '#f59e0b' },
  ]

  return (
    <div>
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
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 272px' }}>
        <ProductionGantt jobs={jobs} />
        <ProductionSidebar />
      </div>
    </div>
  )
}
