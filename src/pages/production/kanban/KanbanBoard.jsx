import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi.js'
import { getWeekStart, getWeekEnd } from '../../../utils/deptAllocation.js'
import { fmtDayMonth } from '../../../utils/time.js'
import { computeGlobalAllocations } from '../../../utils/stockAllocation.js'
import { offsetDate, buildBoardLanes } from './boardLanes.js'
import { useBoardJobActions } from './useBoardJobActions.js'
import WeekNavigator from './WeekNavigator.jsx'
import KanbanSwimLane from './KanbanSwimLane.jsx'
import JobListPanel from '../../../components/planner/JobListPanel.jsx'
import NewJobModal from '../../../components/planner/NewJobModal.jsx'

export default function KanbanBoard() {
  const { data: jobsData, refetch } = useGet('/jobs')
  const { data: codesData } = useGet('/dept-codes')
  const { data: settingsData } = useGet('/settings')
  const { data: stockCacheData } = useGet('/stock-cache/data')
  const { data: bomsData } = useGet('/boms')
  const [weekOffset, setWeekOffset] = useState(0)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [showNewJob, setShowNewJob] = useState(false)
  const [toast, setToast] = useState(null)
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : (Array.isArray(jobsData) ? jobsData : [])
  const prefixMappings = codesData?.prefixMappings || []
  const departments = settingsData?.departments || []
  const stockCache = stockCacheData?.byCode ?? {}
  const globalAllocations = computeGlobalAllocations(jobs)
  const boms = bomsData || []

  const { updatingTaskId, handleTaskPatch, handleTaskAction, handleStatusChange } =
    useBoardJobActions(jobs, refetch, setExpandedTaskId)

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
  const weekLabel = `${fmtDayMonth(weekStart)} – ${fmtDayMonth(weekEnd)}`

  const { laneMap, laneNames } = buildBoardLanes(jobs, prefixMappings, departments, weekStart, weekEnd)

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
        <WeekNavigator
          weekLabel={weekLabel}
          onPrev={() => setWeekOffset(w => w - 1)}
          onNext={() => setWeekOffset(w => w + 1)}
          onFullscreen={handleFullscreen}
        />
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
