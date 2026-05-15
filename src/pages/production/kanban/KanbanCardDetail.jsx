import { getDisplayStatus } from '../../../utils/deptAllocation.js'

const STATUSES = [
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

const base = { fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e4e6ea', cursor: 'pointer', background: '#fff', color: '#374151' }
const active = { ...base, background: '#6c63ff', color: '#fff', border: '1px solid #6c63ff', fontWeight: 600 }
const disabled = { ...base, opacity: 0.5, cursor: 'not-allowed' }

export default function KanbanCardDetail({ task, onStatusChange, isUpdating }) {
  const current = getDisplayStatus(task)
  const comps = task.components || []

  return (
    <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f2f5', background: '#fafbff' }}>
      {task.notes && (
        <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 8, lineHeight: 1.5 }}>{task.notes}</div>
      )}
      {comps.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {comps.slice(0, 6).map(c => (
            <div key={c.itemCode} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', padding: '3px 0', borderBottom: '1px solid #f0f2f5' }}>
              <span style={{ flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.itemCode} — {c.itemDescription}</span>
              <span style={{ flexShrink: 0, color: '#9298c4' }}>{c.quantity} {c.unit}</span>
            </div>
          ))}
          {comps.length > 6 && (
            <div style={{ fontSize: 10, color: '#b0b5cc', marginTop: 4 }}>+{comps.length - 6} more components</div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#9298c4', marginRight: 2 }}>Status:</span>
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => !isUpdating && s.key !== current && onStatusChange(task, s.key)}
            style={isUpdating ? disabled : current === s.key ? active : base}
          >
            {s.label}
          </button>
        ))}
        {isUpdating && <span style={{ fontSize: 11, color: '#9298c4' }}>Saving…</span>}
      </div>
    </div>
  )
}
