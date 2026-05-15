import KanbanCardDetail from './KanbanCardDetail.jsx'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function stockDotColor(task) {
  const s = task.stockSummary || task.allocationStatus?.summary
  if (!s) return task.components?.length > 0 ? '#9ca3af' : '#3b82f6'
  if (s.out > 0) return '#ef4444'
  if (s.short > 0) return '#f59e0b'
  if (s.unknown > 0) return '#9ca3af'
  return '#22c55e'
}

export default function KanbanCard({ task, isExpanded, onExpand, onStatusChange, isUpdating }) {
  const borderColor = task.dueThisWeek ? '#f59e0b' : (task.jobColour || '#dbeafe')
  const bgColor = task.dueThisWeek ? '#fffbeb' : '#fff'
  const dot = stockDotColor(task)

  return (
    <div style={{ marginBottom: 6, borderRadius: 6, border: '1px solid #e4e6ea', overflow: 'hidden' }}>
      <div
        onClick={() => onExpand(task.id)}
        style={{ borderLeft: `4px solid ${borderColor}`, background: bgColor, padding: '8px 10px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b', flex: 1, lineHeight: 1.4, wordBreak: 'break-word' }}>
            {task.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
            <div
              title="Stock status"
              style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }}
            />
            <span style={{ fontSize: 10, color: '#b0b5cc', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {task.jobId ? task.jobId.slice(-8) : ''}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#9298c4', marginTop: 2, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.jobTitle}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#6b7280' }}>
          {task.assignedTo && <span>👤 {task.assignedTo}</span>}
          {task.endDate && <span>📅 {formatDate(task.endDate)}</span>}
          {task.dueThisWeek && (
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>This week</span>
          )}
        </div>
      </div>
      {isExpanded && (
        <KanbanCardDetail task={task} onStatusChange={onStatusChange} isUpdating={isUpdating} />
      )}
    </div>
  )
}
