import { useState } from 'react'
import { apiFetch } from '../../../hooks/useApi.js'
import { appendChildTo, removeNodeById, updateNodeById } from '../../../utils/taskTreeOps.js'

// Task/sub-task mutation handlers for the production board, sharing one
// updatingTaskId flag. Pure relocation of the board's PATCH/PUT logic.
export function useBoardJobActions(jobs, refetch, setExpandedTaskId) {
  const [updatingTaskId, setUpdatingTaskId] = useState(null)

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

  return { updatingTaskId, handleTaskPatch, handleTaskAction, handleStatusChange }
}
