import { useState } from 'react'
import { useGet } from '../hooks/useApi'
import { fmtDDMMM } from '../utils/time'
import NewJobModal from './production/NewJobModal' // TODO: Phase C
import GanttModal  from './production/GanttModal'  // TODO: Phase D

function getAssemblyName(assemblyId, assemblies) {
  if (!assemblyId) return 'Custom job'
  const asm = assemblies.find(a => a.id === assemblyId)
  return asm ? asm.name : 'Custom job'
}

function jobProgress(job) {
  const total = job.tasks?.length || 0
  const done  = job.tasks?.filter(t => t.done).length || 0
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
}

const STATUS_LABELS = {
  quote: 'Quote', in_progress: 'In progress', qc: 'QC', dispatch: 'Dispatch', done: 'Done'
}
const STATUS_COLOURS = {
  quote:       { bg: '#f1f0ea', text: '#5f5e5a' },
  in_progress: { bg: '#e6f1fb', text: '#185fa5' },
  qc:          { bg: '#faeeda', text: '#854f0b' },
  dispatch:    { bg: '#eeedfe', text: '#534ab7' },
  done:        { bg: '#eaf3de', text: '#3b6d11' },
}
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'quote', label: 'Quote' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

function JobCard({ job, assemblies, onClick }) {
  const { total, done, pct } = jobProgress(job)
  const sc = STATUS_COLOURS[job.status] || STATUS_COLOURS.quote
  const dateRange = [fmtDDMMM(job.startDate), fmtDDMMM(job.dueDate)].filter(Boolean).join(' → ')
  return (
    <div onClick={() => onClick(job)}
      style={{ border: '1px solid #e4e6ea', borderLeft: `4px solid ${job.colour || '#dbeafe'}`,
        background: '#fff', borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1d3b', marginBottom: 6,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
          background: sc.bg, color: sc.text }}>{STATUS_LABELS[job.status] || job.status}</span>
        <span style={{ fontSize: 12, color: '#9298c4' }}>{getAssemblyName(job.assemblyId, assemblies)}</span>
      </div>
      {dateRange && <div style={{ fontSize: 12, color: '#b0b5cc', marginBottom: 8 }}>{dateRange}</div>}
      <div style={{ fontSize: 11, color: '#9298c4', marginBottom: 4 }}>{done}/{total} tasks</div>
      <div style={{ background: '#f0f1f5', borderRadius: 4, height: 4 }}>
        <div style={{ width: `${pct}%`, background: '#4f67e4', borderRadius: 4, height: 4 }} />
      </div>
    </div>
  )
}

export default function Production({ onNavigate }) {
  const [activeTab,   setActiveTab]   = useState('all')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showNewJob,  setShowNewJob]  = useState(false)

  const { data: jobsData,      refetch: refetchJobs } = useGet('/jobs')
  const { data: assembliesData }                       = useGet('/jobs/assemblies')

  const jobs       = Array.isArray(jobsData?.jobs)            ? jobsData.jobs            : []
  const assemblies = Array.isArray(assembliesData?.assemblies) ? assembliesData.assemblies : []

  const filtered = activeTab === 'all' ? jobs : jobs.filter(j => j.status === activeTab)

  const btnStyle = { background: '#4f67e4', color: '#fff', border: 'none',
    borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: activeTab === t.key ? '#1a1d3b' : '#9298c4',
              fontWeight: activeTab === t.key ? 700 : 400,
              borderBottom: activeTab === t.key ? '2px solid #4f67e4' : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>
        {!selectedJob && <button onClick={() => setShowNewJob(true)} style={btnStyle}>+ New job</button>}
      </div>

      {selectedJob ? (
        <GanttModal
          inline
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onSaved={() => refetchJobs()}
        />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9298c4' }}>
          <div style={{ fontSize: 15, marginBottom: 12 }}>No jobs yet</div>
          <button onClick={() => setShowNewJob(true)} style={btnStyle}>Create your first job</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(job => (
            <JobCard key={job.id} job={job} assemblies={assemblies} onClick={setSelectedJob} />
          ))}
        </div>
      )}

      {showNewJob && (
        <NewJobModal
          assemblies={assemblies}
          onClose={() => setShowNewJob(false)}
          onSaved={() => { setShowNewJob(false); refetchJobs() }}
        />
      )}
    </div>
  )
}
