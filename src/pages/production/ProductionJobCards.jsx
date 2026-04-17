import { useState } from 'react'
import { styles } from '../../utils/hrStyles'
import JobGantt from '../../components/jobs/JobGantt'
import { apiFetch } from '../../hooks/useApi'

const STATUS_CFG = {
  Draft:         { color: '#555',    bg: '#f0f2f5' },
  Scheduled:     { color: '#1d4ed8', bg: '#dbeafe' },
  'In Progress': { color: '#b45309', bg: '#fffbeb' },
  QC:            { color: '#7c3aed', bg: '#ede9fe' },
  Complete:      { color: '#15803d', bg: '#dcfce7' },
}

function taskProgress(job) {
  if (!job.tasks?.length) return 0
  return Math.round(job.tasks.filter(t => t.status === 'Complete').length / job.tasks.length * 100)
}

function taskSummary(tasks) {
  return tasks.map(t => `${t.label}: ${t.status}`).join(' | ') || '—'
}

function syncOpportunity(job, assemblies) {
  if (!job.unleashed?.assemblyNumber || !assemblies?.length) return null
  const match = assemblies.find(a =>
    a.AssemblyNumber === job.unleashed.assemblyNumber && a.AssemblyStatus === 'Completed'
  )
  if (!match) return null
  const asmTask = (job.tasks || []).find(t => t.type === 'assembly' && t.status !== 'Complete')
  return asmTask ? asmTask : null
}

function SyncBanner({ task, jobId, onDone }) {
  const [marking, setMarking] = useState(false)
  async function markComplete() {
    setMarking(true)
    try {
      await apiFetch(`/jobs/${jobId}/task/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Complete' }),
      })
      onDone()
    } catch { /* silent */ }
    finally { setMarking(false) }
  }
  return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '7px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
      <span style={{ color: '#15803d' }}>Assembly complete in Unleashed — mark task complete?</span>
      <button
        onClick={markComplete}
        disabled={marking}
        style={{ ...styles.btnSmall, background: '#16a34a', color: '#fff', fontSize: 11 }}
      >
        {marking ? '…' : 'Mark Complete'}
      </button>
    </div>
  )
}

export default function ProductionJobCards({ jobs, assemblies, onJobsChanged }) {
  const [expanded, setExpanded] = useState(null)

  if (!jobs?.length) return null

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1d3b', marginBottom: 10 }}>
        Production Jobs ({jobs.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {jobs.map(job => {
          const pct      = taskProgress(job)
          const tasks    = job.tasks || []
          const endDate  = tasks[tasks.length - 1]?.plannedEndDate || job.due || null
          const stCfg    = STATUS_CFG[job.status] || STATUS_CFG.Draft
          const isOpen   = expanded === job.id
          const syncTask = syncOpportunity(job, assemblies)

          return (
            <div
              key={job.id}
              style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 10, overflow: 'hidden' }}
            >
              {/* Card header */}
              <div
                onClick={() => setExpanded(isOpen ? null : job.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9298c4', minWidth: 72 }}>{job.id}</span>
                <span style={{ fontWeight: 600, color: '#1a1d3b', flex: 1, fontSize: 13 }}>{job.projectName || job.name}</span>
                {job.product?.productCode && (
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6c63ff' }}>{job.product.productCode}</span>
                )}
                <span style={{ ...styles.pill, background: stCfg.bg, color: stCfg.color, fontSize: 11 }}>{job.status}</span>
                {endDate && (
                  <span style={{ fontSize: 11, color: '#9298c4' }}>Due: {endDate}</span>
                )}

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 80 }}>
                  <div style={{ flex: 1, height: 5, background: '#f0f2f5', borderRadius: 3 }}>
                    <div style={{ height: 5, borderRadius: 3, background: '#6c63ff', width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#888' }}>{pct}%</span>
                </div>

                <span style={{ fontSize: 16, color: '#b0b5cc', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Task summary line */}
              {tasks.length > 0 && (
                <div style={{ padding: '0 14px 8px', fontSize: 11, color: '#9298c4' }}>
                  {taskSummary(tasks)}
                </div>
              )}

              {/* Accordion body */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #f0f2f5', padding: '12px 14px' }}>
                  {syncTask && (
                    <SyncBanner task={syncTask} jobId={job.id} onDone={onJobsChanged} />
                  )}
                  <JobGantt jobId={job.id} jobs={jobs} compact onTaskUpdated={onJobsChanged} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
