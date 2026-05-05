import { useState } from 'react'
import { isMilestone, taskBarPosition } from '../ganttUtils'
import { ppd } from '../../../utils/ganttLogic'

export default function GanttBar({ row, job, zoomCols, criticalIds, showBaseline, baseline, dragRef, taskRowsRef, onBarRightClick, barColor, onLinkStart }) {
  const { task, isParent, parentId } = row
  const [hovered, setHovered] = useState(false)
  if (isMilestone(task)) return null
  const pos = taskBarPosition(task, zoomCols), p = ppd(zoomCols)
  const hasCp = criticalIds.length > 0, isCrit = criticalIds.includes(task.id), isLocked = !!(task.dependsOn?.length)
  const bl = showBaseline ? baseline.find(b => b.taskId === task.id) : null
  const blPos = bl ? taskBarPosition(bl, zoomCols) : null
  return (
    <>
      {blPos && <div style={{ position: 'absolute', left: blPos.left, width: blPos.width, top: 9, height: 14, background: '#888', opacity: 0.25, borderRadius: 3, pointerEvents: 'none' }} />}
      <div ref={el => { if (el) taskRowsRef.current[task.id] = el }}
        data-task-id={task.id}
        data-parent-id={parentId || ''}
        onMouseDown={e => { if (isParent) return; e.stopPropagation(); dragRef.current = { type: 'move', taskId: task.id, parentId: parentId || null, isMilestone: false, startMouseX: e.clientX, origStartDate: task.startDate, origEndDate: task.endDate, pixPerDay: p } }}
        onContextMenu={e => { e.preventDefault(); if (task.dependsOn?.length) onBarRightClick(e, task.id, parentId, task.dependsOn) }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'absolute', top: isParent ? 4 : 6, left: pos.left, width: pos.width, height: isParent ? 24 : 20, borderRadius: 4,
          background: isParent ? barColor + 'bb' : barColor, cursor: isParent ? 'default' : 'grab',
          userSelect: 'none', display: 'flex', alignItems: 'center', overflow: 'visible',
          borderLeft: hasCp && isCrit && !isParent ? '3px solid #D85A30' : undefined,
          opacity: hasCp && !isCrit && !isParent ? 0.6 : undefined }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${task.pct||0}%`, background: 'rgba(0,0,0,0.18)', borderRadius: 'inherit', pointerEvents: 'none', overflow: 'hidden' }} />
        {isLocked && <span style={{ fontSize: 9, position: 'absolute', left: 2, top: 2, pointerEvents: 'none' }}>🔒</span>}
        <span style={{ fontSize: 11, color: '#fff', padding: `0 ${isLocked ? 14 : 6}px 0 6px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, pointerEvents: 'none', position: 'relative' }}>
          {isParent ? `${task.name} · ${task.pct||0}%` : task.name}
        </span>
        {!isParent && <div onMouseDown={e => { e.stopPropagation(); dragRef.current = { type: 'resize', taskId: task.id, parentId: parentId||null, startMouseX: e.clientX, origEndDate: task.endDate, taskStartDate: task.startDate, pixPerDay: p } }} style={{ width: 8, height: '100%', cursor: 'ew-resize', flexShrink: 0, position: 'relative', zIndex: 1 }} />}
        {!isParent && (
          <div onMouseDown={e => { e.stopPropagation(); onLinkStart(e, task.id, parentId || null, 'left') }}
            style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${barColor}`, cursor: 'crosshair', zIndex: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.35)', opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'all' : 'none', transition: 'opacity 0.15s' }} />
        )}
        {!isParent && (
          <div onMouseDown={e => { e.stopPropagation(); onLinkStart(e, task.id, parentId || null, 'right') }}
            style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${barColor}`, cursor: 'crosshair', zIndex: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.35)', opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'all' : 'none', transition: 'opacity 0.15s' }} />
        )}
      </div>
    </>
  )
}
