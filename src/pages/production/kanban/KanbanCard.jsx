import { checkTaskAllocation } from '../../../utils/stockAllocation.js'
import { getDisplayStatus } from '../../../utils/deptAllocation.js'
import KanbanCardDetail from './KanbanCardDetail.jsx'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function computeAllocStatus(task, stockCache, globalAllocations) {
  const comps = task.components || []
  if (comps.length === 0) return 'none'
  const results = checkTaskAllocation(task, stockCache || {}, globalAllocations || new Map())
  if (results.some(r => r.status === 'out'))     return 'out'
  if (results.some(r => r.status === 'short'))   return 'low'
  if (results.some(r => r.status === 'unknown')) return 'unknown'
  return 'ok'
}

const ALLOC_DOT_COLOR = {
  ok:      '#22c55e',
  low:     '#f59e0b',
  out:     '#ef4444',
  unknown: '#9298c4',
}

const STATUS_DEFS = [
  { key: 'todo',        label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
]

const STATUS_ACTIVE_BG = {
  'todo':        '#6b7280',
  'in-progress': '#f59e0b',
  'done':        '#16a34a',
}

export default function KanbanCard({ task, isExpanded, onExpand, onStatusChange, onTaskPatch, onTaskAction, isUpdating, stockCache, globalAllocations, stockCacheData, departments }) {
  const borderColor = task.dueThisWeek ? '#f59e0b' : (task.jobColour || '#dbeafe')
  const bgColor = task.dueThisWeek ? '#fffbeb' : '#fff'
  const allocStatus = computeAllocStatus(task, stockCache, globalAllocations)
  const dotColor = ALLOC_DOT_COLOR[allocStatus]
  const currentStatus = getDisplayStatus(task)

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
            {allocStatus !== 'none' && (
              <div
                title="Stock status"
                style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }}
              />
            )}
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
        <div style={{ display: 'flex', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
          {STATUS_DEFS.map(s => {
            const isActive = currentStatus === s.key
            return (
              <button
                key={s.key}
                onClick={e => { e.stopPropagation(); if (!isUpdating && s.key !== currentStatus) onStatusChange(task, s.key) }}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  borderColor: isActive ? STATUS_ACTIVE_BG[s.key] : '#d1d5db',
                  background: isActive ? STATUS_ACTIVE_BG[s.key] : 'transparent',
                  color: isActive ? '#fff' : '#6b7280',
                  fontWeight: isActive ? 600 : 400,
                  opacity: isUpdating ? 0.5 : 1,
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>
      {isExpanded && (
        <KanbanCardDetail
          task={task}
          onTaskPatch={onTaskPatch}
          onTaskAction={onTaskAction}
          isUpdating={isUpdating}
          stockCache={stockCache}
          globalAllocations={globalAllocations}
          stockCacheData={stockCacheData}
          departments={departments}
        />
      )}
    </div>
  )
}
