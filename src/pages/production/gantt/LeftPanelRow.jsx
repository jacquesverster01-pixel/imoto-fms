import { isMilestone } from '../ganttUtils'

const ROW_H = 32

// Bug 1 fix: name is a read-only span; clicking anywhere on the row opens TaskWindow.
// Buttons/checkbox stop propagation so they don't accidentally open the window.
// Milestone diamond gets stopPropagation so clicking it only toggles done.
export default function LeftPanelRow({ row, collapsed, onToggle, onCheck, rowIdx, onDragHandleDown, onRowOver, onToggleMilestone, onOpenMenu, onSubtaskDragStart, isSubtaskDragTarget, rowRef }) {
  const { task, isParent, isSubTask } = row
  const isMile = isMilestone(task)
  const rowBg = isSubtaskDragTarget ? 'rgba(79,103,228,0.13)'
    : isParent ? '#eef0fb'
    : isSubTask ? '#f6f7fd'
    : isMile ? '#fffcf4'
    : '#fff'
  const rowShadow = isSubtaskDragTarget ? 'inset 3px 0 0 #4f67e4'
    : isParent ? 'inset 3px 0 0 #4f67e4'
    : isSubTask ? 'inset 3px 0 0 #c5cbf0'
    : undefined
  const code = task.itemCode || task.assemblyCode || null
  return (
    <div
      ref={rowRef}
      data-left-row-task-id={task.id}
      data-left-row-parent-id={row.parentId || ''}
      style={{ minHeight: ROW_H, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 + (row.depth * 20), paddingRight: 4, paddingTop: 4, paddingBottom: 4, borderBottom: '1px solid #ecedf4', cursor: 'pointer', userSelect: 'none', background: rowBg, boxShadow: rowShadow, transition: 'background 0.12s' }}
      onMouseOver={() => onRowOver(rowIdx)}
      onClick={e => onOpenMenu(task.id, row.parentId, isParent, isMile, e)}>
      {row.depth === 0 && (
        <span
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onDragHandleDown(rowIdx) }}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 9, color: isParent ? '#9298c4' : '#ccc', cursor: 'grab', flexShrink: 0, letterSpacing: 1, userSelect: 'none', padding: '0 3px' }}>⋮⋮</span>
      )}
      {isMile
        ? <span onClick={e => { e.stopPropagation(); onToggleMilestone(task.id) }} style={{ cursor: 'pointer', color: task.done ? '#1a1d3b' : '#9298c4', fontSize: 12, flexShrink: 0 }}>◆</span>
        : isParent
          ? <button onClick={e => { e.stopPropagation(); onToggle(task.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f67e4', fontSize: 11, padding: 0, width: 14, flexShrink: 0 }}>{collapsed[task.id] ? '▸' : '▾'}</button>
          : <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', flexShrink: 0, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!task.done} onChange={e => { e.stopPropagation(); onCheck(task.id, row.parentId) }} style={{ cursor: 'pointer', margin: 0 }} />
            </div>
      }
      <div
        onMouseDown={e => { if (e.button !== 0) return; onSubtaskDragStart(task.id, row.parentId, e, task.name) }}
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: task.done ? '#b0b5cc' : isParent ? '#1a1d3b' : isSubTask ? '#3a3e5c' : '#1a1d3b', textDecoration: task.done ? 'line-through' : 'none', fontWeight: isParent ? 600 : 400, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
          {task.name}
        </span>
        {code && (
          <span style={{ fontSize: 10, color: '#9298c4', fontFamily: 'monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {code}
          </span>
        )}
      </div>
      {row.depth === 0 && (
        <button onClick={e => { e.stopPropagation(); onOpenMenu(task.id, row.parentId, isParent, isMile, e) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9298c4', fontSize: 16, padding: '0 3px', flexShrink: 0, lineHeight: 1, borderRadius: 4 }}>⋮</button>
      )}
    </div>
  )
}
