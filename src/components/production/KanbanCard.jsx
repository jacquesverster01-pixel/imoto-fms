const PHASE_PILL = {
  'pre-assembly': { label: 'PRE', bg: '#f0f2f5', color: '#5a5f8a' },
  'installation':  { label: 'INST', bg: '#dbeafe', color: '#1d4ed8' },
}

export default function KanbanCard({ task, deptColour, phase, dependencyStatus, onDragStart, isDragging, isSaving }) {
  const jobRef = task.jobId ? `JOB-${String(task.jobId).slice(-4).toUpperCase()}` : '—'
  const pill = PHASE_PILL[phase]
  const hasWarning = dependencyStatus?.status === 'warning'
  const missingList = dependencyStatus?.missing?.join(', ') || ''

  const containerStyle = {
    background: '#fff',
    borderRadius: 8,
    borderLeft: `4px solid ${deptColour || '#6c63ff'}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    padding: '8px 10px',
    marginBottom: 6,
    cursor: 'grab',
    opacity: isDragging ? 0.5 : isSaving ? 0.7 : 1,
    pointerEvents: isSaving ? 'none' : 'auto',
    userSelect: 'none',
    transition: 'opacity 0.15s',
  }

  return (
    <div style={containerStyle} draggable onDragStart={onDragStart}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b', flex: 1, lineHeight: 1.3 }}>
          {task.name || task.label || 'Untitled'}
        </span>
        {hasWarning && (
          <span title={`Predecessor not done: ${missingList}`} style={{ fontSize: 13, cursor: 'help', flexShrink: 0 }}>
            ⚠
          </span>
        )}
        {isSaving && (
          <span style={{ fontSize: 10, color: '#b0b5cc', flexShrink: 0 }}>saving…</span>
        )}
      </div>

      <div style={{ fontSize: 10, color: '#9298c4', marginBottom: 2 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>[{jobRef}]</span>
        {task.jobTitle && <span> {task.jobTitle}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: task.assignee ? 2 : 0 }}>
        <span style={{ fontSize: 10, color: '#b0b5cc', fontFamily: 'monospace' }}>
          {task.assemblyCode || '—'}
        </span>
        {pill && (
          <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: pill.bg, color: pill.color, letterSpacing: '0.03em' }}>
            {pill.label}
          </span>
        )}
      </div>

      {task.assignee && (
        <div style={{ fontSize: 10, color: '#9298c4' }}>{task.assignee}</div>
      )}
    </div>
  )
}
