import { useState } from 'react'
import KanbanCard from './KanbanCard.jsx'
import { checkDependency, getKanbanStatus } from './kanbanUtils.js'
import { getPhaseForCode } from '../../utils/codeParser.js'

const COLS = [
  { key: 'todo',       label: 'To Do' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'qc',         label: 'QC' },
  { key: 'done',       label: 'Done' },
]

const COL_ACCENT = {
  todo:       '#e5e7eb',
  inprogress: '#bfdbfe',
  qc:         '#fde68a',
  done:       '#bbf7d0',
}

export default function DeptKanbanBoard({ deptName, deptColour, tasks, assemblyPhases, allJobs, onMoveTask, savingTaskId }) {
  const [draggedTask, setDraggedTask] = useState(null)
  const [dropTargetCol, setDropTargetCol] = useState(null)

  function getJobTasks(jobId) {
    const job = (allJobs || []).find(j => j.id === jobId)
    return job?.tasks || []
  }

  function handleDragStart(e, task) {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, colKey) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetCol(colKey)
  }

  function handleDragLeave(colKey) {
    if (dropTargetCol === colKey) setDropTargetCol(null)
  }

  async function handleDrop(e, colKey) {
    e.preventDefault()
    setDropTargetCol(null)
    if (!draggedTask) return
    const task = draggedTask
    setDraggedTask(null)
    if (getKanbanStatus(task) === colKey) return
    await onMoveTask(task.jobId, task.id, colKey)
  }

  function handleDragEnd() {
    setDraggedTask(null)
    setDropTargetCol(null)
  }

  const allColTasks = COLS.flatMap(c => tasks[c.key] || [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {COLS.map(col => {
        const colTasks = tasks[col.key] || []
        const isOver = dropTargetCol === col.key
        return (
          <div
            key={col.key}
            onDragOver={e => handleDragOver(e, col.key)}
            onDragLeave={() => handleDragLeave(col.key)}
            onDrop={e => handleDrop(e, col.key)}
            style={{
              background: isOver ? '#f5f3ff' : '#f8f9fb',
              borderRadius: 10,
              padding: '10px 8px',
              minHeight: 200,
              border: isOver ? `1.5px dashed ${deptColour || '#6c63ff'}` : '1.5px solid transparent',
              transition: 'background 0.1s, border 0.1s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: COL_ACCENT[col.key] }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9298c4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col.label}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#b0b5cc', background: '#f0f2f5', borderRadius: 10, padding: '1px 7px', fontWeight: 500 }}>
                {colTasks.length}
              </span>
            </div>

            {colTasks.map(task => {
              const jobTasks = getJobTasks(task.jobId)
              const depStatus = checkDependency(task, jobTasks, assemblyPhases)
              const phase = getPhaseForCode(task.assemblyCode, assemblyPhases)
              return (
                <KanbanCard
                  key={task.id}
                  task={task}
                  deptColour={deptColour}
                  phase={phase}
                  dependencyStatus={depStatus}
                  isDragging={draggedTask?.id === task.id}
                  isSaving={savingTaskId === task.id}
                  onDragStart={e => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                />
              )
            })}

            {colTasks.length === 0 && !isOver && (
              <div style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center', paddingTop: 24 }}>
                No tasks
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
