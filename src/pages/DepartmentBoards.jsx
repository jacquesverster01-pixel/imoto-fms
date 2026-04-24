import { useState, useEffect } from 'react'
import { useGet, apiFetch } from '../hooks/useApi'
import { groupTasks, countUnallocated, checkDependency, listMappedDepartments, colourForDepartment } from '../components/production/kanbanUtils.js'
import DeptKanbanBoard from '../components/production/DeptKanbanBoard.jsx'
import UnallocatedPanel from '../components/production/UnallocatedPanel.jsx'

function getDeptColour(deptName, settings) {
  const dept = (settings?.departments || []).find(d => d.name === deptName)
  if (dept?.color) return dept.color
  return colourForDepartment(deptName)
}

export default function DepartmentBoards({ onNavigate }) {
  const [activeDept,   setActiveDept]   = useState(null)
  const [savingTaskId, setSavingTaskId] = useState(null)
  const [toast,        setToast]        = useState(null)

  const { data: jobsData, refetch: refetchJobs } = useGet('/jobs')
  const { data: codesData } = useGet('/dept-codes')
  const { data: settingsData } = useGet('/settings')

  const jobs           = Array.isArray(jobsData) ? jobsData : (Array.isArray(jobsData?.jobs) ? jobsData.jobs : [])
  const prefixMappings = codesData?.prefixMappings || []
  const assemblyPhases = codesData?.assemblyPhases || []
  const mappedDepts    = listMappedDepartments(prefixMappings)

  useEffect(() => {
    if (activeDept === null && mappedDepts.length > 0) {
      setActiveDept(mappedDepts[0])
    }
  }, [mappedDepts, activeDept])

  function showToast(msg, type = 'warn') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleMoveTask(jobId, taskId, newStatus) {
    const job = jobs.find(j => j.id === jobId)
    const task = (job?.tasks || []).find(t => t.id === taskId)
    if (task) {
      const dep = checkDependency(task, job.tasks || [], assemblyPhases)
      if (dep.status === 'warning' && ['inprogress', 'qc', 'done'].includes(newStatus)) {
        showToast(`⚠ Predecessor ${dep.missing.join(', ')} is not yet Done. Moved anyway.`, 'warn')
      }
    }
    setSavingTaskId(taskId)
    try {
      await apiFetch(`/jobs/${jobId}/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanbanStatus: newStatus, done: newStatus === 'done' }),
      })
      await refetchJobs()
    } catch (err) {
      showToast(`Failed to update task: ${err.message}`, 'error')
    } finally {
      setSavingTaskId(null)
    }
  }

  const groups       = groupTasks(jobs, prefixMappings)
  const unallocCount = countUnallocated(jobs, prefixMappings)

  if (mappedDepts.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e4e6ea', padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#1a1d3b', fontWeight: 600, marginBottom: 8 }}>No departments configured</div>
        <div style={{ fontSize: 12, color: '#9298c4', marginBottom: 20 }}>
          Discover prefixes and assign them in Settings → Department Codes.
        </div>
        <button
          onClick={() => onNavigate('settings')}
          style={{ fontSize: 12, padding: '8px 20px', borderRadius: 8, background: '#6c63ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          Open Settings
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 20, zIndex: 9999,
          padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
          color: '#fff', maxWidth: 360, lineHeight: 1.5,
          background: toast.type === 'error' ? 'rgba(163,45,45,0.95)' : 'rgba(146,110,0,0.92)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 16, borderBottom: '1px solid #e4e6ea' }}>
        {mappedDepts.map(deptName => {
          const colour = getDeptColour(deptName, settingsData)
          return (
            <button
              key={deptName}
              onClick={() => setActiveDept(deptName)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 500, padding: '8px 14px',
                border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
                borderBottom: activeDept === deptName ? `2px solid ${colour}` : '2px solid transparent',
                background: activeDept === deptName ? '#fff' : 'transparent',
                color: activeDept === deptName ? '#1a1d3b' : '#9298c4',
              }}
            >
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colour, flexShrink: 0 }} />
              {deptName}
            </button>
          )
        })}
        <button
          onClick={() => setActiveDept('__unallocated__')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, padding: '8px 14px',
            border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
            borderBottom: activeDept === '__unallocated__' ? '2px solid #ef4444' : '2px solid transparent',
            background: activeDept === '__unallocated__' ? '#fff' : 'transparent',
            color: activeDept === '__unallocated__' ? '#1a1d3b' : '#9298c4',
          }}
        >
          Unallocated
          {unallocCount > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 700, padding: '1px 6px' }}>
              {unallocCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e6ea', padding: 16 }}>
        {activeDept === '__unallocated__' ? (
          <UnallocatedPanel
            tasks={groups.unallocated}
            onNavigateToSettings={() => onNavigate('settings')}
          />
        ) : activeDept && groups[activeDept] ? (
          <DeptKanbanBoard
            deptName={activeDept}
            deptColour={getDeptColour(activeDept, settingsData)}
            tasks={groups[activeDept]}
            assemblyPhases={assemblyPhases}
            allJobs={jobs}
            onMoveTask={handleMoveTask}
            savingTaskId={savingTaskId}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 13, color: '#b0b5cc' }}>
            Select a department tab above.
          </div>
        )}
      </div>
    </div>
  )
}
