import { useState } from 'react'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`
}

function ganttWindow(tasks) {
  const times = tasks
    .flatMap(t => [t.startDate, t.endDate])
    .filter(Boolean)
    .map(d => +new Date(d))
  if (!times.length) return null
  const DAY = 86400000
  return { start: Math.min(...times) - DAY, end: Math.max(...times) + DAY }
}

function barStyle(task, win) {
  if (!task.startDate || !task.endDate || !win) return null
  const span = win.end - win.start
  const s = +new Date(task.startDate)
  const e = +new Date(task.endDate)
  const left = Math.max(0, (s - win.start) / span) * 100
  const width = Math.max(2, (e - s) / span) * 100
  return { left: `${left.toFixed(1)}%`, width: `${width.toFixed(1)}%` }
}

function deptForCode(code, prefixes) {
  if (!code) return null
  return (prefixes || []).find(p => code.startsWith(p.prefix))?.department || null
}

const thStyle = {
  textAlign: 'left', padding: '8px 12px', fontSize: 11,
  fontWeight: 600, color: '#9298c4', borderBottom: '1px solid #f0f2f5',
  textTransform: 'uppercase', letterSpacing: '0.06em', background: '#fafbff'
}

export default function EditableJobGantt({ job, prefixMappings, onTaskEdit, onTaskAdd, onTaskDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const tasks = job?.tasks || []
  const win = ganttWindow(tasks)
  const prefixes = prefixMappings || []

  if (!job) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 14, color: '#b0b5cc' }}>
        Select a job to view its Gantt, or create a new one.
      </span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderBottom: '1px solid #e4e6ea', background: '#fff', flexShrink: 0
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1d3b' }}>{job.title}</div>
          <div style={{ fontSize: 11, color: '#9298c4' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            {job.dueDate ? ` · Due ${fmtDate(job.dueDate)}` : ''}
          </div>
        </div>
        <button onClick={onTaskAdd}
          style={{
            marginLeft: 'auto', padding: '7px 14px', borderRadius: 8,
            border: 'none', background: '#6c63ff', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}>
          + Add Task
        </button>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {tasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 160, gap: 8 }}>
            <div style={{ fontSize: 13, color: '#b0b5cc' }}>No tasks yet.</div>
            <button onClick={onTaskAdd}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none',
                background: '#6c63ff', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
              + Add first task
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 180 }}>Task</th>
                <th style={{ ...thStyle, minWidth: 100 }}>Department</th>
                <th style={{ ...thStyle, minWidth: 200 }}>Timeline</th>
                <th style={{ ...thStyle, minWidth: 70 }}>Start</th>
                <th style={{ ...thStyle, minWidth: 70 }}>End</th>
                <th style={{ ...thStyle, width: 56 }}></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const dept = deptForCode(task.assemblyCode, prefixes)
                const bar = barStyle(task, win)
                const isConfirm = deleteConfirm === task.id
                return (
                  <tr key={task.id}
                    onClick={() => onTaskEdit(task)}
                    style={{ borderBottom: '1px solid #f7f8fa', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f4f5ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1d3b' }}>{task.name}</div>
                      {task.assemblyCode && (
                        <div style={{ fontSize: 10, color: '#9298c4', marginTop: 2 }}>{task.assemblyCode}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: dept ? '#1a1d3b' : '#c5c8e8' }}>
                      {dept || 'Unallocated'}
                    </td>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ position: 'relative', height: 18, background: '#f7f8fa', borderRadius: 4 }}>
                        {bar ? (
                          <div style={{
                            position: 'absolute', top: 0, height: '100%', borderRadius: 4,
                            background: '#6c63ff', left: bar.left, width: bar.width
                          }} />
                        ) : (
                          <span style={{
                            position: 'absolute', left: 8, top: '50%',
                            transform: 'translateY(-50%)', fontSize: 10, color: '#c5c8e8'
                          }}>No dates set</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#9298c4', whiteSpace: 'nowrap' }}>
                      {fmtDate(task.startDate)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#9298c4', whiteSpace: 'nowrap' }}>
                      {fmtDate(task.endDate)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}
                      onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          if (isConfirm) { onTaskDelete(task.id); setDeleteConfirm(null) }
                          else setDeleteConfirm(task.id)
                        }}
                        style={{
                          padding: '3px 8px', borderRadius: 4, border: 'none',
                          cursor: 'pointer', fontSize: 11,
                          background: isConfirm ? '#fef2f2' : 'transparent',
                          color: isConfirm ? '#dc2626' : '#b0b5cc'
                        }}
                        title={isConfirm ? 'Click again to confirm delete' : 'Delete task'}>
                        {isConfirm ? 'Sure?' : '✕'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
