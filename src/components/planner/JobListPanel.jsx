import { useState } from 'react'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export default function JobListPanel({ jobs, selectedJobId, onSelect, onNewJob, onDelete }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [hoveredCardId, setHoveredCardId] = useState(null)
  const [btnHoverId, setBtnHoverId] = useState(null)

  const handleDeleteClick = (e, jobId) => {
    e.stopPropagation()
    setConfirmDeleteId(jobId)
    setTimeout(() => setConfirmDeleteId(id => id === jobId ? null : id), 4000)
  }

  const handleConfirmDelete = (e, jobId) => {
    e.stopPropagation()
    setConfirmDeleteId(null)
    onDelete(jobId)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #e4e6ea', flexShrink: 0 }}>
        <button
          onClick={onNewJob}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: '#6c63ff', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}
        >
          + New Job
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {(!jobs || jobs.length === 0) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <span style={{ fontSize: 12, color: '#b0b5cc', textAlign: 'center', lineHeight: 1.6 }}>
              No jobs yet.<br />Create one to get started.
            </span>
          </div>
        ) : (
          jobs.map(job => {
            const isActive = job.id === selectedJobId
            const isHovered = hoveredCardId === job.id
            const isConfirming = confirmDeleteId === job.id
            const showDeleteBtn = isHovered || isConfirming
            const taskCount = (job.tasks || []).length
            return (
              <div
                key={job.id}
                onClick={() => onSelect(job.id)}
                onMouseEnter={() => setHoveredCardId(job.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  marginBottom: 2, display: 'block', position: 'relative',
                  background: isActive ? '#ededff' : (isHovered ? '#f7f8fa' : 'transparent'),
                  borderLeft: `3px solid ${isActive ? '#6c63ff' : 'transparent'}`,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ fontSize: 10, color: '#9298c4', marginBottom: 2 }}>[{job.id}]</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d3b' }}>{job.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
                  {job.dueDate && (
                    <span style={{ fontSize: 11, color: '#b0b5cc' }}>Due {fmtDate(job.dueDate)}</span>
                  )}
                  <span style={{ fontSize: 11, color: '#9298c4', marginLeft: 'auto' }}>
                    {taskCount} task{taskCount !== 1 ? 's' : ''}
                  </span>
                </div>
                {showDeleteBtn && (
                  isConfirming ? (
                    <button
                      onClick={e => handleConfirmDelete(e, job.id)}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: '#fef2f2', color: '#dc2626', border: 'none',
                        borderRadius: 10, fontSize: 10, padding: '2px 6px',
                        cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={e => handleDeleteClick(e, job.id)}
                      onMouseEnter={e => { e.stopPropagation(); setBtnHoverId(job.id) }}
                      onMouseLeave={e => { e.stopPropagation(); setBtnHoverId(null) }}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 18, height: 18, border: 'none',
                        background: btnHoverId === job.id ? '#fef2f2' : 'transparent',
                        color: btnHoverId === job.id ? '#dc2626' : '#b0b5cc',
                        borderRadius: 4, fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  )
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
