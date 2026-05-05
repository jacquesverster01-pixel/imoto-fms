import LeftPanelRow from './LeftPanelRow'

const HDR_H = 48

export default function GanttLeftPanel({ visibleRows, tasks, collapsed, onToggle, leftPanelWidth, leftPanelRef, onLeftScroll, subtaskDropHighlight, rowElsRef, onCheck, onToggleMilestone, onOpenMenu, onDragHandleDown, onRowOver, onSubtaskDragStart, onAddTask, onAddMilestone }) {
  return (
    <div ref={leftPanelRef} onScroll={onLeftScroll} style={{ width: leftPanelWidth, flexShrink: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ height: HDR_H, background: '#f8f9fb', borderBottom: '1px solid #e4e6ea' }} />
      {visibleRows.map((row, ri) => {
        const taskIdx = row.depth > 0 ? -1 : tasks.findIndex(t => t.id === row.task.id)
        return (
          <LeftPanelRow key={`${row.parentId||''}-${row.task.id}`}
            row={row} collapsed={collapsed}
            onToggle={onToggle}
            onCheck={onCheck} rowIdx={taskIdx}
            onDragHandleDown={onDragHandleDown} onRowOver={onRowOver}
            onToggleMilestone={onToggleMilestone} onOpenMenu={onOpenMenu}
            onSubtaskDragStart={onSubtaskDragStart}
            isSubtaskDragTarget={subtaskDropHighlight === row.task.id}
            rowRef={el => { rowElsRef.current[ri] = el }} />
        )
      })}
      <div style={{ display: 'flex', borderTop: '1px solid #f0f1f5' }}>
        <button onClick={onAddTask} style={{ flex: 1, padding: '8px 12px', fontSize: 12, color: '#4f67e4', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>+ Add task</button>
        <button onClick={onAddMilestone} style={{ padding: '8px 10px', fontSize: 12, color: '#9298c4', background: 'none', border: 'none', cursor: 'pointer' }}>◆ Milestone</button>
      </div>
    </div>
  )
}
