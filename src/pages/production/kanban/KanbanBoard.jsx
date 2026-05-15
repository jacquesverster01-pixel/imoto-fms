import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi.js'
import { getTaskDepartments, taskOverlapsWeek, getWeekStart, getWeekEnd } from '../../../utils/deptAllocation.js'
import KanbanSwimLane from './KanbanSwimLane.jsx'

function walk(tasks, jobId, jobTitle, jobColour, jobPriority) {
  const out = []
  for (const t of tasks || []) {
    out.push({ ...t, jobId, jobTitle, jobColour, jobPriority })
    if (t.children?.length) out.push(...walk(t.children, jobId, jobTitle, jobColour, jobPriority))
  }
  return out
}

function flattenJobTasks(jobs) {
  return jobs.flatMap(job => walk(job.tasks || [], job.id, job.title, job.colour, job.priority || 99))
}

function buildLaneMap(tasks, prefixMappings, weekStart, weekEnd) {
  const map = {}
  for (const task of tasks) {
    const depts = getTaskDepartments(task, prefixMappings)
    const thisWeek = taskOverlapsWeek(task, weekStart, weekEnd)
    const enriched = { ...task, dueThisWeek: thisWeek }
    const lanes = depts.length > 0 ? depts : ['Unassigned']
    for (const dept of lanes) {
      if (!map[dept]) map[dept] = []
      map[dept].push(enriched)
    }
  }
  for (const dept of Object.keys(map)) {
    map[dept].sort((a, b) => {
      if (a.dueThisWeek !== b.dueThisWeek) return a.dueThisWeek ? -1 : 1
      return (a.jobPriority || 99) - (b.jobPriority || 99)
    })
  }
  return map
}

function offsetDate(date, weeks) {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function fmtShort(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const navBtn = {
  fontSize: 14, padding: '5px 13px', border: '1px solid #e4e6ea',
  borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#1a1d3b', lineHeight: 1,
}

export default function KanbanBoard() {
  const { data: jobsData, refetch } = useGet('/jobs')
  const { data: codesData } = useGet('/dept-codes')
  const { data: settingsData } = useGet('/settings')
  const [weekOffset, setWeekOffset] = useState(0)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [updatingTaskId, setUpdatingTaskId] = useState(null)

  const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : (Array.isArray(jobsData) ? jobsData : [])
  const prefixMappings = codesData?.prefixMappings || []
  const departments = settingsData?.departments || []

  const weekStart = getWeekStart(offsetDate(new Date(), weekOffset))
  const weekEnd = getWeekEnd(weekStart)
  const weekLabel = `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`

  const allTasks = flattenJobTasks(jobs)
  const undoneTasks = allTasks.filter(t => t.kanbanStatus !== 'done' && t.done !== true)
  const laneMap = buildLaneMap(undoneTasks, prefixMappings, weekStart, weekEnd)

  const deptNames = departments.map(d => d.name)
  const extraDepts = Object.keys(laneMap).filter(d => d !== 'Unassigned' && !deptNames.includes(d))
  const laneNames = [...deptNames, ...extraDepts, ...(laneMap['Unassigned'] ? ['Unassigned'] : [])]

  async function handleStatusChange(task, newStatus) {
    setUpdatingTaskId(task.id)
    const payloads = {
      'todo':        { kanbanStatus: 'todo',       done: false },
      'in-progress': { kanbanStatus: 'inprogress', done: false },
      'done':        { kanbanStatus: 'done',        done: true  },
    }
    try {
      await apiFetch(`/jobs/${task.jobId}/task/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payloads[newStatus] || { kanbanStatus: newStatus }),
      })
      await refetch()
    } catch (err) {
      console.error('Status update failed:', err)
    } finally {
      setUpdatingTaskId(null)
      if (newStatus === 'done') setExpandedTaskId(null)
    }
  }

  function handleExpand(taskId) {
    setExpandedTaskId(prev => prev === taskId ? null : taskId)
  }

  function handleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1d3b' }}>Department Boards</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={navBtn} onClick={() => setWeekOffset(w => w - 1)}>←</button>
          <span style={{ fontSize: 13, color: '#1a1d3b', minWidth: 190, textAlign: 'center', fontWeight: 500 }}>
            {weekLabel}
          </span>
          <button style={navBtn} onClick={() => setWeekOffset(w => w + 1)}>→</button>
        </div>
        <button style={navBtn} onClick={handleFullscreen} title="Fullscreen">⛶</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {laneNames.map(deptName => {
          const cfg = departments.find(d => d.name === deptName)
          return (
            <KanbanSwimLane
              key={deptName}
              department={deptName}
              deptColour={cfg?.color || '#9298c4'}
              tasks={laneMap[deptName] || []}
              expandedTaskId={expandedTaskId}
              onExpand={handleExpand}
              onStatusChange={handleStatusChange}
              updatingTaskId={updatingTaskId}
            />
          )
        })}
      </div>
    </div>
  )
}
