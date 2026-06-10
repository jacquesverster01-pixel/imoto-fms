import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi.js'
import { getTaskDepartments, taskOverlapsWeek, getWeekStart, getWeekEnd, flattenJobTasks } from '../../../utils/deptAllocation.js'
import { computeGlobalAllocations } from '../../../utils/stockAllocation.js'
import { appendChildTo, removeNodeById, updateNodeById } from '../../../utils/taskTreeOps.js'
import KanbanSwimLane from './KanbanSwimLane.jsx'
import JobListPanel from '../../../components/planner/JobListPanel.jsx'
import NewJobModal from '../../../components/planner/NewJobModal.jsx'

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
  const { data: stockCacheData } = useGet('/stock-cache/data')
  const { data: bomsData } = useGet('/boms')
  const [weekOffset, setWeekOffset] = useState(0)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [updatingTaskId, setUpdatingTaskId] = useState(null)
  const [showNewJob, setShowNewJob] = useState(false)
  const [toast, setToast] = useState(null)
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : (Array.isArray(jobsData) ? jobsData : [])
  const prefixMappings = codesData?.prefixMappings || []
  const departments = settingsData?.departments || []
  const stockCache = stockCacheData?.byCode ?? {}
  const globalAllocations = computeGlobalAllocations(jobs)
  const boms = bomsData || []

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleJobCreated() {
    await refetch()
    showToast('Job created')
  }

  async function handleJobDelete(jobId) {
    try {
      await apiFetch(`/jobs/${jobId}`, { method: 'DELETE' })
      await refetch()
      showToast('Job deleted')
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  const weekStart = getWeekStart(offsetDate(new Date(), weekOffset))
  const weekEnd = getWeekEnd(weekStart)
  const weekLabel = `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`

  const allTasks = flattenJobTasks(jobs)
  const undoneTasks = allTasks.filter(t => t.kanbanStatus !== 'done' && t.done !== true)
  const laneMap = buildLaneMap(undoneTasks, prefixMappings, weekStart, weekEnd)

  const deptNames = departments.map(d => d.name)
  const extraDepts = Object.keys(laneMap).filter(d => d !== 'Unassigned' && !deptNames.includes(d))
  const laneNames = [...deptNames, ...extraDepts, ...(laneMap['Unassigned'] ? ['Unassigned'] : [])]

  async function handleTaskPatch(task, patch) {
    setUpdatingTaskId(task.id)
    try {
      await apiFetch(`/jobs/${task.jobId}/task/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      await refetch()
    } catch (err) {
      console.error('Task update failed:', err)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function handleTaskAction(action, task, payload) {
    setUpdatingTaskId(task.id)
    try {
      const job = jobs.find(j => j.id === task.jobId)
      if (!job) return
      if (action === 'addChild') {
        const child = { id: `st-${Date.now()}`, name: 'New sub-task', done: false, pct: 0,
                        dependsOn: [], children: [], components: [], assignedTo: null }
        const next = appendChildTo(job.tasks, task.id, child)
        await apiFetch(`/jobs/${job.id}/tasks`, { method: 'PUT', body: JSON.stringify({ tasks: next }) })
      } else if (action === 'deleteTask') {
        const next = removeNodeById(job.tasks, task.id)
        await apiFetch(`/jobs/${job.id}/tasks`, { method: 'PUT', body: JSON.stringify({ tasks: next }) })
      } else if (action === 'addFileRecord') {
        const next = updateNodeById(job.tasks, task.id,
                       n => ({ ...n, files: [...(n.files || []), payload] }))
        await apiFetch(`/jobs/${job.id}/tasks`, { method: 'PUT', body: JSON.stringify({ tasks: next }) })
      } else if (action === 'deleteFile') {
        const next = updateNodeById(job.tasks, task.id,
                       n => ({ ...n, files: (n.files || []).filter(f => f.id !== payload) }))
        await apiFetch(`/jobs/${job.id}/tasks`, { method: 'PUT', body: JSON.stringify({ tasks: next }) })
      }
      await refetch()
    } catch (err) {
      console.error(`Task action ${action} failed:`, err)
    } finally {
      setUpdatingTaskId(null)
    }
  }

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
    <div style={{ display: 'flex', height: 'calc(100vh - 112px)', gap: 0 }}>
      {/* Left panel — job manager */}
      <div style={{
        width: panelCollapsed ? 40 : 260,
        flexShrink: 0,
        borderRight: '1px solid #e4e6ea',
        background: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
      }}>
        <JobListPanel
          jobs={jobs}
          selectedJobId={null}
          onSelect={() => {}}
          onNewJob={() => setShowNewJob(true)}
          onDelete={handleJobDelete}
          panelCollapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(c => !c)}
        />
      </div>

      {/* Right — board */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', paddingLeft: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1d3b' }}>Production board</span>
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
                onTaskPatch={handleTaskPatch}
                onTaskAction={handleTaskAction}
                updatingTaskId={updatingTaskId}
                stockCache={stockCache}
                globalAllocations={globalAllocations}
                stockCacheData={stockCacheData}
                departments={departments}
              />
            )
          })}
        </div>
      </div>

      {/* New job modal */}
      {showNewJob && (
        <NewJobModal
          boms={boms}
          onClose={() => setShowNewJob(false)}
          onCreated={handleJobCreated}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, padding: '10px 16px',
          borderRadius: 8, background: '#6c63ff', color: '#fff',
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(108,99,255,0.3)',
          zIndex: 100,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
