const labelStyle = { fontSize: 11, fontWeight: 600, color: '#9298c4', marginBottom: 3, display: 'block' }

export default function SubTaskList({ task, onTaskPatch, onTaskAction, isUpdating }) {
  return (
    <div style={{ marginTop: 6 }}>
      <label style={labelStyle}>Sub-tasks</label>
      {(task.children || []).length === 0 && (
        <div style={{ fontSize: 12, color: '#c0c5d8', marginBottom: 4 }}>No sub-tasks yet</div>
      )}
      {(task.children || []).map(child => (
        <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
          <input
            type="checkbox"
            checked={!!child.done}
            onChange={() => onTaskPatch({ ...child, jobId: task.jobId }, { done: !child.done, pct: !child.done ? 100 : 0 })}
            disabled={isUpdating}
            style={{ flexShrink: 0, cursor: isUpdating ? 'not-allowed' : 'pointer' }}
          />
          <input
            defaultValue={child.name}
            onBlur={e => {
              const trimmed = e.target.value.trim()
              if (trimmed && trimmed !== child.name) onTaskPatch({ ...child, jobId: task.jobId }, { name: trimmed })
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            disabled={isUpdating}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, background: 'transparent', color: child.done ? '#b0b5cc' : '#1a1d3b', textDecoration: child.done ? 'line-through' : 'none', minWidth: 0 }}
          />
        </div>
      ))}
      <button
        onClick={() => onTaskAction('addChild', task)}
        disabled={isUpdating}
        style={{ marginTop: 5, background: 'none', border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', color: '#4f67e4', fontSize: 12, padding: 0, fontWeight: 600 }}
      >
        + Add sub-task
      </button>
    </div>
  )
}
