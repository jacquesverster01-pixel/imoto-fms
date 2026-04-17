function Pill({ text, color, bg }) {
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>{text}</span>
}

export default function JobDetailPanel({ job, onClose, statusConfig, priorityConfig }) {
  return (
    <div className="bg-white rounded-xl border p-4 self-start" style={{ borderColor: '#6c63ff', position: 'sticky', top: 0 }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold" style={{ color: '#1a1d3b' }}>Job details</span>
        <button onClick={onClose} className="text-xs" style={{ color: '#b0b5cc' }}>✕ Close</button>
      </div>

      <div className="text-xs font-mono mb-1" style={{ color: '#b0b5cc' }}>{job.id}</div>
      <div className="text-sm font-bold mb-1" style={{ color: '#1a1d3b' }}>{job.name}</div>
      <div className="text-xs mb-3" style={{ color: '#9298c4' }}>{job.description}</div>

      <div className="flex gap-2 mb-4">
        <Pill text={statusConfig[job.status].label} color={statusConfig[job.status].color} bg={statusConfig[job.status].bg} />
        <Pill text={job.priority} color={priorityConfig[job.priority].color} bg={priorityConfig[job.priority].bg} />
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {[
          { label: 'Client',     value: job.client },
          { label: 'Start date', value: job.start },
          { label: 'Due date',   value: job.due },
          { label: 'Progress',   value: `${job.pct}%` },
          { label: 'Trades',     value: job.trades.join(', ') },
        ].map(r => (
          <div key={r.label} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: '#f7f8fa' }}>
            <span className="text-xs" style={{ color: '#9298c4' }}>{r.label}</span>
            <span className="text-xs font-medium" style={{ color: '#1a1d3b' }}>{r.value}</span>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="text-xs font-medium mb-2" style={{ color: '#9298c4' }}>Assigned staff</div>
        {job.assignedTo.length > 0
          ? job.assignedTo.map((e, i) => (
              <div key={i} className="text-xs py-1" style={{ color: '#4a4f7a' }}>· {e}</div>
            ))
          : <div className="text-xs" style={{ color: '#b0b5cc' }}>No staff assigned yet</div>
        }
      </div>

      {job.flags.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: '#9298c4' }}>Active alerts</div>
          {job.flags.map((f, fi) => (
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
  )
}
