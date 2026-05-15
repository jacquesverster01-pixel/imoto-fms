import KanbanCard from './KanbanCard.jsx'

export default function KanbanSwimLane({ department, deptColour, tasks, expandedTaskId, onExpand, onStatusChange, updatingTaskId, stockCache, globalAllocations, stockCacheData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 10, border: '1px solid #e4e6ea', overflow: 'hidden', minHeight: 120 }}>
      <div style={{ borderTop: `3px solid ${deptColour}`, padding: '10px 12px', borderBottom: '1px solid #f0f2f5', background: '#fafbff' }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: '#1a1d3b', letterSpacing: '0.06em' }}>
          {department.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: '#9298c4', marginTop: 2 }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ padding: '8px', overflowY: 'auto', flex: 1 }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 8px', fontSize: 12, color: '#d1d5db' }}>
            No active tasks
          </div>
        ) : (
          tasks.map(task => (
            <KanbanCard
              key={`${task.jobId}/${task.id}`}
              task={task}
              isExpanded={expandedTaskId === task.id}
              onExpand={onExpand}
              onStatusChange={onStatusChange}
              isUpdating={updatingTaskId === task.id}
              stockCache={stockCache}
              globalAllocations={globalAllocations}
              stockCacheData={stockCacheData}
            />
          ))
        )}
      </div>
    </div>
  )
}
