import { useState } from 'react'
import { useGet } from '../hooks/useApi'
import JobsList from './jobs/JobsList'
import JobGantt from '../components/jobs/JobGantt'

const TABS = [
  { id: 'list',  label: 'Jobs List' },
  { id: 'gantt', label: 'Gantt' },
]

export default function Jobs() {
  const [activeTab, setActiveTab]         = useState('list')
  const [selectedJobId, setSelectedJobId] = useState(null)

  const { data: rawJobs, loading, error, refetch } = useGet('/jobs')
  const jobs = Array.isArray(rawJobs) ? rawJobs : []

  function openGantt(jobId) {
    setSelectedJobId(jobId)
    setActiveTab('gantt')
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1d3b', margin: 0 }}>Jobs & Scheduling</h2>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #f0f2f5', marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px', fontSize: 13,
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? '#6c63ff' : '#9298c4',
              background: 'none', border: 'none',
              borderBottom: activeTab === t.id ? '2px solid #6c63ff' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#9298c4', fontSize: 13, padding: 24 }}>Loading jobs…</div>}
      {error   && <div style={{ color: '#ef4444', fontSize: 13, padding: 24 }}>Error: {error}</div>}

      {!loading && !error && activeTab === 'list' && (
        <JobsList jobs={jobs} onViewGantt={openGantt} onRefresh={refetch} />
      )}
      {!loading && !error && activeTab === 'gantt' && (
        <JobGantt jobId={selectedJobId} jobs={jobs} onTaskUpdated={refetch} />
      )}
    </div>
  )
}
