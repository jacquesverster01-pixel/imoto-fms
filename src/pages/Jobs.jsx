import { useState } from 'react'

const jobs = [
  {
    id: 'J001', name: 'SAPS Mobile Clinic #14', client: 'SAPS', trades: ['Electrical', 'Assembly'],
    start: '10 Mar', due: '28 Mar', pct: 72, status: 'on-track', priority: 'High',
    assignedTo: ['Peter van Wyk', 'Jane Smith'], description: 'Mobile health clinic conversion on Ford Transit chassis.',
    flags: [],
  },
  {
    id: 'J002', name: 'City of CT Canteen Unit', client: 'City of Cape Town', trades: ['Electrical'],
    start: '17 Mar', due: '4 Apr', pct: 38, status: 'at-risk', priority: 'High',
    assignedTo: ['Peter van Wyk'], description: 'Mobile canteen unit for municipal parks department.',
    flags: ['2 electricians absent — progress delayed'],
  },
  {
    id: 'J003', name: 'SANDF Comms Vehicle', client: 'SANDF', trades: ['Welding', 'Electrical'],
    start: '28 Mar', due: '18 Apr', pct: 0, status: 'blocked', priority: 'High',
    assignedTo: ['Thabo Nkosi'], description: 'Communications vehicle conversion for SANDF field operations.',
    flags: ['Conduit stock out of stock', 'Angle grinder #4 needs repair'],
  },
  {
    id: 'J004', name: 'Glencore Mobile Lab', client: 'Glencore', trades: ['Cabinet Making', 'Electrical'],
    start: '3 Mar', due: '25 Mar', pct: 91, status: 'on-track', priority: 'Medium',
    assignedTo: ['Sarah Jacobs', 'Peter van Wyk'], description: 'Mobile computer lab for mine site use.',
    flags: [],
  },
  {
    id: 'J005', name: 'SAPS Vehicle #15', client: 'SAPS', trades: ['Electrical', 'Welding', 'Assembly', 'Plumbing'],
    start: '30 Mar', due: '30 Apr', pct: 0, status: 'planned', priority: 'Medium',
    assignedTo: [], description: 'Standard SAPS mobile unit — spec TBC.',
    flags: [],
  },
]

const statusConfig = {
  'on-track': { label: 'On track', color: '#16a34a', bg: '#e8f8f0' },
  'at-risk': { label: 'At risk', color: '#b45309', bg: '#fffbeb' },
  'blocked': { label: 'Blocked', color: '#dc2626', bg: '#fef2f2' },
  'planned': { label: 'Planned', color: '#9298c4', bg: '#f4f5f7' },
  'complete': { label: 'Complete', color: '#6c63ff', bg: '#ede9fe' },
}

const priorityConfig = {
  High: { color: '#dc2626', bg: '#fef2f2' },
  Medium: { color: '#b45309', bg: '#fffbeb' },
  Low: { color: '#16a34a', bg: '#e8f8f0' },
}

function Pill({ text, color, bg }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>
      {text}
    </span>
  )
}

function ProgressBar({ pct, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#f0f2f5' }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color, minWidth: 28 }}>{pct}%</span>
    </div>
  )
}

export default function Jobs() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const filters = [
    { id: 'all', label: 'All jobs' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'at-risk', label: 'At risk' },
    { id: 'on-track', label: 'On track' },
    { id: 'planned', label: 'Planned' },
  ]

  const filtered = jobs.filter(j => {
    const matchFilter = filter === 'all' || j.status === filter
    const matchSearch = j.name.toLowerCase().includes(search.toLowerCase()) ||
      j.client.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const selectedJob = jobs.find(j => j.id === selected)

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: selected ? '1fr 320px' : '1fr' }}>

      {/* Job list */}
      <div>
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex gap-1">
            {filters.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{
                  background: filter === f.id ? '#6c63ff15' : '#fff',
                  color: filter === f.id ? '#6c63ff' : '#9298c4',
                  borderColor: filter === f.id ? '#6c63ff30' : '#e4e6ea',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <input
            className="text-xs px-3 py-1.5 rounded-lg border outline-none ml-auto"
            style={{ borderColor: '#e4e6ea', width: 200 }}
            placeholder="Search jobs or client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#6c63ff' }}>
            + New job
          </button>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          {filtered.map(job => {
            const s = statusConfig[job.status]
            const p = priorityConfig[job.priority]
            const isSelected = selected === job.id
            return (
              <div key={job.id}
                onClick={() => setSelected(isSelected ? null : job.id)}
                className="bg-white rounded-xl border cursor-pointer transition-all"
                style={{
                  borderColor: isSelected ? '#6c63ff' : '#e4e6ea',
                  boxShadow: isSelected ? '0 0 0 3px #6c63ff18' : 'none',
                }}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono" style={{ color: '#b0b5cc' }}>{job.id}</span>
                        <span className="text-sm font-semibold" style={{ color: '#1a1d3b' }}>{job.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-xs" style={{ color: '#9298c4' }}>{job.client}</span>
                        <span style={{ color: '#e4e6ea' }}>·</span>
                        <span className="text-xs" style={{ color: '#9298c4' }}>{job.trades.join(', ')}</span>
                        <span style={{ color: '#e4e6ea' }}>·</span>
                        <span className="text-xs" style={{ color: '#9298c4' }}>{job.start} → {job.due}</span>
                      </div>
                      <ProgressBar pct={job.pct} color={s.color} />
                      {job.flags.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                          {job.flags.map((f, fi) => (
                            <div key={fi} className="flex items-center gap-1.5 text-xs" style={{ color: '#dc2626' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Pill text={s.label} color={s.color} bg={s.bg} />
                      <Pill text={job.priority} color={p.color} bg={p.bg} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Job detail panel */}
      {selectedJob && (
        <div className="bg-white rounded-xl border p-4 self-start" style={{ borderColor: '#6c63ff', position: 'sticky', top: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold" style={{ color: '#1a1d3b' }}>Job details</span>
            <button onClick={() => setSelected(null)} className="text-xs" style={{ color: '#b0b5cc' }}>✕ Close</button>
          </div>

          <div className="text-xs font-mono mb-1" style={{ color: '#b0b5cc' }}>{selectedJob.id}</div>
          <div className="text-sm font-bold mb-1" style={{ color: '#1a1d3b' }}>{selectedJob.name}</div>
          <div className="text-xs mb-3" style={{ color: '#9298c4' }}>{selectedJob.description}</div>

          <div className="flex gap-2 mb-4">
            <Pill text={statusConfig[selectedJob.status].label} color={statusConfig[selectedJob.status].color} bg={statusConfig[selectedJob.status].bg} />
            <Pill text={selectedJob.priority} color={priorityConfig[selectedJob.priority].color} bg={priorityConfig[selectedJob.priority].bg} />
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {[
              { label: 'Client', value: selectedJob.client },
              { label: 'Start date', value: selectedJob.start },
              { label: 'Due date', value: selectedJob.due },
              { label: 'Progress', value: `${selectedJob.pct}%` },
              { label: 'Trades', value: selectedJob.trades.join(', ') },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: '#f7f8fa' }}>
                <span className="text-xs" style={{ color: '#9298c4' }}>{r.label}</span>
                <span className="text-xs font-medium" style={{ color: '#1a1d3b' }}>{r.value}</span>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <div className="text-xs font-medium mb-2" style={{ color: '#9298c4' }}>Assigned staff</div>
            {selectedJob.assignedTo.length > 0
              ? selectedJob.assignedTo.map((e, i) => (
                  <div key={i} className="text-xs py-1" style={{ color: '#4a4f7a' }}>· {e}</div>
                ))
              : <div className="text-xs" style={{ color: '#b0b5cc' }}>No staff assigned yet</div>
            }
          </div>

          {selectedJob.flags.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: '#9298c4' }}>Active alerts</div>
              {selectedJob.flags.map((f, fi) => (
                <div key={fi} className="flex items-center gap-1.5 text-xs py-1" style={{ color: '#dc2626' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          )}

          <button className="w-full mt-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#6c63ff' }}>
            Edit job
          </button>
        </div>
      )}
    </div>
  )
}