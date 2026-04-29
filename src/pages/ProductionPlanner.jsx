import { useState } from 'react'
import { useGet, apiFetch } from '../hooks/useApi'
import JobListPanel from '../components/planner/JobListPanel'
import NewJobModal from '../components/planner/NewJobModal'
import GanttModal from './production/GanttModal'

export default function ProductionPlanner() {
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [showNewJob, setShowNewJob] = useState(false)
  const [toast, setToast] = useState(null)

  const { data: jobsData, refetch: refetchJobs } = useGet('/jobs')
  const { data: bomsData } = useGet('/boms')

  const jobs = Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || [])
  const boms = bomsData || []

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleJobCreated = (jobId) => {
    refetchJobs()
    setSelectedJobId(jobId)
    showToast('Job created')
  }

  const handleJobDelete = async (jobId) => {
    try {
      await apiFetch(`/jobs/${jobId}`, { method: 'DELETE' })
      if (selectedJobId === jobId) setSelectedJobId(null)
      refetchJobs()
      showToast('Job deleted')
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 112px)', gap: 0, overflow: 'hidden' }}>
      {/* Left panel — job list */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid #e4e6ea',
        background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <JobListPanel
          jobs={jobs}
          selectedJobId={selectedJobId}
          onSelect={setSelectedJobId}
          onNewJob={() => setShowNewJob(true)}
          onDelete={handleJobDelete}
        />
      </div>

      {/* Right panel — real Gantt */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff', overflow: 'hidden' }}>
        {selectedJob ? (
          <GanttModal key={selectedJob.id} job={selectedJob} embedded onSaved={refetchJobs} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, color: '#b0b5cc' }}>
              Select a job to view its Gantt, or create a new one.
            </span>
          </div>
        )}
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
          zIndex: 100
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
