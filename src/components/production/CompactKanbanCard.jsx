export default function CompactKanbanCard({ task, deptColour, dependencyStatus }) {
  return (
    <div style={{
      borderLeft: `4px solid ${deptColour || '#9298c4'}`,
      background: '#fff',
      borderRadius: 6,
      padding: '5px 8px',
      marginBottom: 4,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: '#1a1d3b', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.name || '(unnamed)'}
        </div>
        {dependencyStatus?.status === 'warning' && (
          <span title="Dependency not complete" style={{ color: '#f59e0b', fontSize: 13, flexShrink: 0 }}>⚠</span>
        )}
      </div>
      <div style={{ fontSize: 10, color: '#b0b5cc', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        [{task.jobTitle || task.jobId}]
      </div>
    </div>
  )
}
