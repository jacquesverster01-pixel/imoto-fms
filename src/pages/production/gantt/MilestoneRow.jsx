import { taskBarPosition } from '../ganttUtils'
import { ppd } from '../../../utils/ganttLogic'

export default function MilestoneRow({ task, zoomCols, job, onToggleDone, dragRef, taskRowsRef }) {
  const pos = taskBarPosition(task, zoomCols), p = ppd(zoomCols), colour = job.colour || '#4f67e4'
  return (
    <div ref={el => { if (el) taskRowsRef.current[task.id] = el }}
      onMouseDown={e => { e.stopPropagation(); dragRef.current = { type: 'move', taskId: task.id, parentId: null, isMilestone: true, startMouseX: e.clientX, origStartDate: task.startDate, origEndDate: task.endDate, pixPerDay: p } }}
      onClick={() => onToggleDone(task.id)}
      style={{ position: 'absolute', left: pos.left + pos.width / 2 - 8, top: 6, width: 16, height: 16, background: task.done ? colour : 'transparent', border: `2px solid ${colour}`, transform: 'rotate(45deg)', borderRadius: 2, cursor: 'pointer', zIndex: 2, userSelect: 'none' }}
      title={task.name} />
  )
}
