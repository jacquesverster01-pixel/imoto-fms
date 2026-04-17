import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00Z')
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`
}

const today = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10)

const BAR_COLOR = { assembly: '#3B82F6', installation: '#F59E0B' }
const TASK_STATUS_CFG = {
  Draft:         { color: '#555',    bg: '#f0f2f5' },
  Scheduled:     { color: '#1d4ed8', bg: '#dbeafe' },
  'In Progress': { color: '#b45309', bg: '#fffbeb' },
  Complete:      { color: '#15803d', bg: '#dcfce7' },
}

function buildTimeline(tasks) {
  const dates = tasks.flatMap(t => [t.plannedStartDate, t.plannedEndDate].filter(Boolean))
  if (!dates.length) return null
  const minDate = dates.reduce((a, b) => a < b ? a : b)
  const maxDate = dates.reduce((a, b) => a > b ? a : b)
  const startMs = new Date(minDate + 'T00:00:00Z').getTime()
  const endMs   = new Date(maxDate + 'T00:00:00Z').getTime()
  const totalMs = endMs - startMs || 86400000

  // Week labels — snap start to Monday
  const weeks = []
  const cur = new Date(startMs)
  const dow = cur.getUTCDay()
  cur.setUTCDate(cur.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  while (cur.getTime() <= endMs + 7 * 86400000) {
    weeks.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 7)
  }
  return { startMs, endMs, totalMs, minDate, maxDate, weeks }
}

function pct(dateStr, startMs, totalMs) {
  return ((new Date(dateStr + 'T00:00:00Z').getTime() - startMs) / totalMs) * 100
}

export default function JobGantt({ jobId, jobs, compact = false, onTaskUpdated }) {
  const [taskEdits, setTaskEdits] = useState({})
  const [saving, setSaving]       = useState(null)

  const job = jobs?.find(j => j.id === jobId)

  if (!jobId) {
    return <div style={{ padding: 32, textAlign: 'center', color: '#b0b5cc', fontSize: 13 }}>
      Select a job from the Jobs List to view its Gantt.
    </div>
  }
  if (!job) return <div style={{ padding: 24, color: '#aaa', fontSize: 13 }}>Job not found.</div>

  const tasks = job.tasks || []
  if (!tasks.length) return (
    <div style={{ padding: 24 }}>
      <div style={{ fontWeight: 700, color: '#1a1d3b', marginBottom: 8 }}>{job.projectName || job.name}</div>
      <div style={{ color: '#aaa', fontSize: 13 }}>No tasks defined for this job.</div>
    </div>
  )

  const tl = buildTimeline(tasks)
  if (!tl) return <div style={{ padding: 24, color: '#aaa', fontSize: 13 }}>No planned dates set.</div>

  async function patchTask(taskId, updates) {
    setSaving(taskId)
    setTaskEdits(prev => ({ ...prev, [taskId]: { ...(prev[taskId] || {}), ...updates } }))
    try {
      await apiFetch(`/jobs/${job.id}/task/${taskId}`, { method: 'PATCH', body: JSON.stringify(updates) })
      if (onTaskUpdated) onTaskUpdated()
    } catch {
      setTaskEdits(prev => { const n = { ...prev }; delete n[taskId]; return n })
    } finally {
      setSaving(null)
    }
  }

  const LEFT_W = compact ? 140 : 200
  const ROW_H  = compact ? 30  : 52

  return (
    <div style={{ fontSize: 13 }}>
      <style>{`@keyframes gantt-pulse{0%,100%{opacity:1}50%{opacity:.65}}.gantt-ip{animation:gantt-pulse 2s ease-in-out infinite}`}</style>

      {!compact && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9298c4' }}>{job.id}</span>
          <span style={{ fontWeight: 700, color: '#1a1d3b' }}>{job.projectName || job.name}</span>
          {job.status && <span style={{ ...styles.pill, background: '#f0f2f5', color: '#555' }}>{job.status}</span>}
          {job.jobType && <span style={{ ...styles.pill, background: '#f0f0f0', color: '#888', fontSize: 10 }}>{job.jobType.replace(/_/g, ' ')}</span>}
        </div>
      )}

      <div style={{ border: '1px solid #e4e6ea', borderRadius: 8, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'flex', background: '#f8f9fb', borderBottom: '1px solid #f0f2f5' }}>
          <div style={{ width: LEFT_W, flexShrink: 0, padding: '5px 12px', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Task
          </div>
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {tl.weeks.map(w => (
              <div key={w} style={{ flex: 1, borderLeft: '1px solid #f0f2f5', padding: '5px 4px', fontSize: 10, color: '#b0b5cc', minWidth: 0, overflow: 'hidden' }}>
                {fmtDate(w)}
              </div>
            ))}
          </div>
        </div>

        {/* Task rows */}
        {tasks.map((rawTask, i) => {
          const edits   = taskEdits[rawTask.id] || {}
          const task    = { ...rawTask, ...edits }
          const stCfg   = TASK_STATUS_CFG[task.status] || TASK_STATUS_CFG.Draft
          const barClr  = BAR_COLOR[task.type] || '#6c63ff'
          const overdue = task.plannedEndDate && task.plannedEndDate < today && task.status !== 'Complete'
          const inProg  = task.status === 'In Progress'

          const lPct = task.plannedStartDate ? Math.max(0, pct(task.plannedStartDate, tl.startMs, tl.totalMs)) : 0
          const rPct = task.plannedEndDate   ? Math.min(100, pct(task.plannedEndDate,  tl.startMs, tl.totalMs)) : lPct + 5
          const wPct = Math.max(rPct - lPct, 2)

          const alPct = task.actualStartDate ? Math.max(0,   pct(task.actualStartDate, tl.startMs, tl.totalMs)) : null
          const arPct = task.actualEndDate   ? Math.min(100, pct(task.actualEndDate,   tl.startMs, tl.totalMs)) : alPct != null ? alPct + 2 : null

          return (
            <div key={rawTask.id} style={{ borderBottom: i < tasks.length - 1 ? '1px solid #f0f2f5' : 'none' }}>
              <div style={{ display: 'flex', minHeight: ROW_H }}>
                <div style={{ width: LEFT_W, flexShrink: 0, padding: compact ? '4px 8px' : '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#1a1d3b', fontSize: compact ? 11 : 12 }}>{task.label}</div>
                  {!compact && task.departmentName && <div style={{ fontSize: 10, color: '#9298c4' }}>{task.departmentName}</div>}
                  <span style={{ ...styles.pill, background: stCfg.bg, color: stCfg.color, fontSize: 10, marginTop: 2, alignSelf: 'flex-start' }}>{task.status}</span>
                </div>

                <div style={{ flex: 1, position: 'relative', minHeight: ROW_H }}>
                  {/* Week grid lines */}
                  {tl.weeks.map(w => {
                    const p = pct(w, tl.startMs, tl.totalMs)
                    return p >= 0 && p <= 100
                      ? <div key={w} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 1, background: '#f0f2f5' }} />
                      : null
                  })}
                  {/* Today line */}
                  {today >= tl.minDate && today <= tl.maxDate && (
                    <div style={{ position: 'absolute', left: `${pct(today, tl.startMs, tl.totalMs)}%`, top: 0, bottom: 0, width: 2, background: '#ef4444', zIndex: 2 }} />
                  )}
                  {/* Planned bar */}
                  <div
                    title={compact ? `${task.label}: ${task.plannedStartDate || ''} → ${task.plannedEndDate || ''}` : undefined}
                    className={inProg ? 'gantt-ip' : ''}
                    style={{
                      position: 'absolute', zIndex: 1,
                      left: `${lPct}%`, width: `${wPct}%`,
                      top: compact ? 6 : 10, height: compact ? ROW_H - 12 : 20,
                      borderRadius: 4, background: barClr,
                      outline: overdue ? '2px solid #ef4444' : 'none',
                    }}
                  />
                  {/* Actual bar (non-compact) */}
                  {!compact && alPct != null && (
                    <div style={{
                      position: 'absolute', zIndex: 1,
                      left: `${alPct}%`, width: `${Math.max((arPct || alPct + 2) - alPct, 2)}%`,
                      top: 34, height: 6, borderRadius: 3, background: '#16a34a',
                    }} />
                  )}
                </div>
              </div>

              {/* Inline controls — non-compact only */}
              {!compact && (
                <div style={{ display: 'flex', gap: 8, padding: '0 12px 10px', paddingLeft: LEFT_W + 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={task.status}
                    disabled={saving === rawTask.id}
                    onChange={e => patchTask(rawTask.id, { status: e.target.value })}
                    style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid #e4e6ea', background: '#fff', cursor: 'pointer' }}
                  >
                    {['Draft','Scheduled','In Progress','Complete'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {(task.status === 'In Progress' || task.status === 'Complete') && (
                    <>
                      <input type="date" value={task.actualStartDate || ''} style={{ fontSize: 11, padding: '3px 6px', border: '1px solid #e4e6ea', borderRadius: 5 }}
                        onChange={e => patchTask(rawTask.id, { actualStartDate: e.target.value })} />
                      <input type="date" value={task.actualEndDate || ''} style={{ fontSize: 11, padding: '3px 6px', border: '1px solid #e4e6ea', borderRadius: 5 }}
                        onChange={e => patchTask(rawTask.id, { actualEndDate: e.target.value })} />
                    </>
                  )}
                  {task.useHours && (
                    <input type="number" min="0" value={task.actualHours || ''} placeholder="Actual hrs"
                      style={{ fontSize: 11, padding: '3px 6px', border: '1px solid #e4e6ea', borderRadius: 5, width: 80 }}
                      onChange={e => patchTask(rawTask.id, { actualHours: Number(e.target.value) })} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
