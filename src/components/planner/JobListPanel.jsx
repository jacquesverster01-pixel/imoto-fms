const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export default function JobListPanel({ jobs, selectedJobId, onSelect, onNewJob }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #e4e6ea', flexShrink: 0 }}>
        <button
          onClick={onNewJob}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: '#6c63ff', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}
        >
          + New Job
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {(!jobs || jobs.length === 0) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <span style={{ fontSize: 12, color: '#b0b5cc', textAlign: 'center', lineHeight: 1.6 }}>
              No jobs yet.<br />Create one to get started.
            </span>
          </div>
        ) : (
          jobs.map(job => {
            const isActive = job.id === selectedJobId
            const taskCount = (job.tasks || []).length
            return (
              <button
                key={job.id}
                onClick={() => onSelect(job.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  marginBottom: 2, display: 'block',
                  background: isActive ? '#ededff' : 'transparent',
                  borderLeft: `3px solid ${isActive ? '#6c63ff' : 'transparent'}`,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f7f8fa' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ fontSize: 10, color: '#9298c4', marginBottom: 2 }}>[{job.id}]</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d3b' }}>{job.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
                  {job.dueDate && (
                    <span style={{ fontSize: 11, color: '#b0b5cc' }}>Due {fmtDate(job.dueDate)}</span>
                  )}
                  <span style={{ fontSize: 11, color: '#9298c4', marginLeft: 'auto' }}>
                    {taskCount} task{taskCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
