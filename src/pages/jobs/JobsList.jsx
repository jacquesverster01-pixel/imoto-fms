import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

const STATUS_CFG = {
  Draft:         { color: '#555',    bg: '#f0f2f5' },
  Scheduled:     { color: '#1d4ed8', bg: '#dbeafe' },
  'In Progress': { color: '#b45309', bg: '#fffbeb' },
  QC:            { color: '#7c3aed', bg: '#ede9fe' },
  Complete:      { color: '#15803d', bg: '#dcfce7' },
  'on-track':    { color: '#16a34a', bg: '#e8f8f0' },
  'at-risk':     { color: '#b45309', bg: '#fffbeb' },
  blocked:       { color: '#dc2626', bg: '#fef2f2' },
  planned:       { color: '#9298c4', bg: '#f4f5f7' },
  complete:      { color: '#15803d', bg: '#dcfce7' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Draft
  return <span style={{ ...styles.pill, background: cfg.bg, color: cfg.color }}>{status}</span>
}

function taskProgress(job) {
  if (!job.tasks?.length) return job.pct ?? 0
  return Math.round(job.tasks.filter(t => t.status === 'Complete').length / job.tasks.length * 100)
}

function EditModal({ job, onClose, onSaved }) {
  const [name, setName]     = useState(job.projectName || job.name || '')
  const [status, setStatus] = useState(job.status || 'Draft')
  const [notes, setNotes]   = useState(job.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const isNew  = !!job.projectName
  const statuses = isNew
    ? ['Draft','Scheduled','In Progress','QC','Complete']
    : ['on-track','at-risk','blocked','planned','complete']

  async function save() {
    setSaving(true); setError('')
    try {
      const body = isNew ? { projectName: name, status, notes } : { name, status }
      await apiFetch(`/jobs/${job.id}`, { method: 'PUT', body: JSON.stringify(body) })
      onSaved()
    } catch { setError('Save failed.') }
    finally { setSaving(false) }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 360 }}>
        <h3 style={styles.modalTitle}>Edit Job</h3>
        <label style={styles.label}>Project Name</label>
        <input style={styles.input} value={name} onChange={e => setName(e.target.value)} />
        <label style={styles.label}>Status</label>
        <select style={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isNew && (
          <>
            <label style={styles.label}>Notes</label>
            <textarea style={{ ...styles.input, height: 56, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
          </>
        )}
        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JobsList({ jobs, onViewGantt, onRefresh }) {
  const [editJob, setEditJob]           = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [search, setSearch]             = useState('')

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    return !q ||
      (j.projectName || j.name || '').toLowerCase().includes(q) ||
      j.id.toLowerCase().includes(q)
  })

  async function handleDelete(job) {
    setDeleting(true)
    try {
      await apiFetch(`/jobs/${job.id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      onRefresh()
    } catch { /* silent */ }
    finally { setDeleting(false) }
  }

  return (
    <div>
      {editJob && (
        <EditModal
          job={editJob}
          onClose={() => setEditJob(null)}
          onSaved={() => { setEditJob(null); onRefresh() }}
        />
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input
          style={{ ...styles.input, marginBottom: 0, width: 220 }}
          placeholder="Search job ID or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, color: '#9298c4' }}>{filtered.length} job{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fb' }}>
              {['ID','Project Name','Product','Type','Status','Assembly Dept','Install Dept','Start','End','Progress',''].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>No jobs found.</td></tr>
            ) : filtered.map((job, i) => {
              const pct        = taskProgress(job)
              const tasks      = job.tasks || []
              const startDate  = tasks[0]?.plannedStartDate || job.start || '—'
              const endDate    = tasks[tasks.length - 1]?.plannedEndDate || job.due || '—'
              const isDeleting = confirmDelete === job.id

              return (
                <tr key={job.id} style={{ borderBottom: '1px solid #f0f2f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11, color: '#9298c4' }}>{job.id}</td>
                  <td style={{ ...styles.td, fontWeight: 600, maxWidth: 180 }}>{job.projectName || job.name}</td>
                  <td style={{ ...styles.td, fontSize: 11, color: '#9298c4' }}>{job.product?.productCode || '—'}</td>
                  <td style={{ ...styles.td, fontSize: 11, color: '#888' }}>
                    {job.jobType?.replace(/_/g, ' ') || job.trades?.join(', ') || '—'}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <StatusBadge status={job.status} />
                      {job.unleashed?.assemblyStatus && (
                        <span style={{ ...styles.pill, background: '#f0fdf4', color: '#15803d', fontSize: 10 }}>
                          🔗 {job.unleashed.assemblyStatus}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontSize: 11 }}>{tasks.find(t => t.type === 'assembly')?.departmentName || '—'}</td>
                  <td style={{ ...styles.td, fontSize: 11 }}>{tasks.find(t => t.type === 'installation')?.departmentName || '—'}</td>
                  <td style={{ ...styles.td, fontSize: 11 }}>{startDate}</td>
                  <td style={{ ...styles.td, fontSize: 11 }}>{endDate}</td>
                  <td style={{ ...styles.td, minWidth: 90 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 5, background: '#f0f2f5', borderRadius: 3 }}>
                        <div style={{ height: 5, borderRadius: 3, background: '#6c63ff', width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#888', minWidth: 24 }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, minWidth: 150 }}>
                    {isDeleting ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#dc2626' }}>Delete?</span>
                        <button onClick={() => handleDelete(job)} disabled={deleting}
                          style={{ ...styles.btnSmall, background: '#ef4444', color: '#fff', fontSize: 10 }}>
                          {deleting ? '…' : 'Yes'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555', fontSize: 10 }}>
                          No
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {tasks.length > 0 && (
                          <button onClick={() => onViewGantt(job.id)}
                            style={{ ...styles.btnSmall, background: '#f5f3ff', color: '#6c63ff', border: '1px solid #e0deff', fontSize: 11 }}>
                            Gantt
                          </button>
                        )}
                        <button onClick={() => setEditJob(job)}
                          style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555', fontSize: 11 }}>
                          Edit
                        </button>
                        <button onClick={() => setConfirmDelete(job.id)}
                          style={{ ...styles.btnSmall, background: '#fff3f3', color: '#dc2626', border: '1px solid #fca5a5', fontSize: 11 }}>
                          Del
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
