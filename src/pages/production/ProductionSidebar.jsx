const sideAlerts = [
  { dot: '#ef4444', text: '2 electricians absent — City of CT at risk',      tag: 'Staff · High'   },
  { dot: '#ef4444', text: 'Angle grinder #4 flagged for repair',             tag: 'Tools · High'   },
  { dot: '#f59e0b', text: 'Conduit stock below minimum — 3 days to reorder', tag: 'Stock · Medium' },
  { dot: '#f59e0b', text: 'Peter van Wyk leave 30–31 Mar — check Job 002',   tag: 'HR · Medium'    },
  { dot: '#6c63ff', text: 'Thabo Nkosi First Aid cert expires in 12 days',   tag: 'H&S · Low'      },
]
const staffByTrade = [
  { trade: 'Electrical',     on: 2, total: 4 },
  { trade: 'Welding',        on: 3, total: 3 },
  { trade: 'Assembly',       on: 3, total: 3 },
  { trade: 'Cabinet making', on: 3, total: 4 },
  { trade: 'Plumbing',       on: 2, total: 2 },
]
function staffBarColor(on, total) {
  const pct = on / total
  if (pct < 0.6) return '#ef4444'
  if (pct < 0.8) return '#f59e0b'
  return '#22c55e'
}

export default function ProductionSidebar() {
  return (
    <div className="flex flex-col gap-3">
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
  )
}
