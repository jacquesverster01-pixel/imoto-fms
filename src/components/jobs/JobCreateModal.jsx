import { useState } from 'react'
import { useGet, apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

const JOB_TYPE_TASKS = {
  combined:          ['assembly', 'installation'],
  assembly_only:     ['assembly'],
  installation_only: ['installation'],
}
const TASK_LABELS = { assembly: 'Assembly', installation: 'Installation' }

function addWorkdays(startStr, numDays) {
  if (!startStr || !numDays || numDays <= 0) return null
  const d = new Date(startStr + 'T00:00:00Z')
  let added = 0
  while (added < numDays) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) added++
  }
  return d.toISOString().split('T')[0]
}

const emptyTask = { deptName: '', startDate: '', duration: '', useHours: false }

export default function JobCreateModal({ product, onClose, onCreated }) {
  const [projectName, setProjectName] = useState(product?.productDescription || '')
  const [jobType, setJobType]         = useState('combined')
  const [tasks, setTasks]             = useState({ assembly: { ...emptyTask }, installation: { ...emptyTask } })
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const { data: settingsData } = useGet('/settings')
  const departments = settingsData?.departments || []
  const activeTypes = JOB_TYPE_TASKS[jobType]

  function setTask(type, field, value) {
    setTasks(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const builtTasks = activeTypes.map((type, i) => {
        const t   = tasks[type]
        const dur = parseInt(t.duration) || 0
        return {
          id: `TASK-${Date.now()}-${i + 1}`,
          type,
          label: TASK_LABELS[type],
          departmentId: t.deptName,
          departmentName: t.deptName,
          status: 'Draft',
          plannedStartDate: t.startDate || null,
          plannedEndDate: t.startDate && dur ? addWorkdays(t.startDate, dur) : null,
          plannedDays: t.useHours ? null : dur || null,
          plannedHours: t.useHours ? dur || null : null,
          useHours: t.useHours,
          actualStartDate: null, actualEndDate: null, actualDays: null, actualHours: null, notes: '',
        }
      })
      const job = {
        projectName, jobType, status: 'Draft',
        product: { productCode: product?.productCode, productDescription: product?.productDescription, guid: product?.guid },
        tasks: builtTasks,
        unleashed: { assemblyGuid: null, assemblyNumber: null, assemblyStatus: null, lastSyncedAt: null },
        notes,
      }
      const res = await apiFetch('/jobs', { method: 'POST', body: JSON.stringify(job) })
      onCreated(res)
    } catch (err) {
      setError('Failed to create job. Is the server running?')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={styles.modalTitle}>Create Job from Inventory</h3>

        {product && (
          <div style={{ background: '#f8f7ff', border: '1px solid #e0deff', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>
            <span style={{ color: '#888' }}>Product: </span>
            <span style={{ fontFamily: 'monospace', color: '#6c63ff' }}>{product.productCode}</span>
            {' — '}{product.productDescription}
            {product.qtyAvailable != null && (
              <span style={{ color: '#16a34a', marginLeft: 8 }}>({product.qtyAvailable} available)</span>
            )}
          </div>
        )}

        <label style={styles.label}>Project Name</label>
        <input style={styles.input} value={projectName} onChange={e => setProjectName(e.target.value)} />

        <label style={styles.label}>Job Type</label>
        <select style={styles.input} value={jobType} onChange={e => setJobType(e.target.value)}>
          <option value="combined">Combined (Assembly + Installation)</option>
          <option value="assembly_only">Assembly Only</option>
          <option value="installation_only">Installation Only</option>
        </select>

        {activeTypes.map(type => {
          const t       = tasks[type]
          const dur     = parseInt(t.duration) || 0
          const endDate = !t.useHours && t.startDate && dur ? addWorkdays(t.startDate, dur) : null
          return (
            <div key={type} style={{ background: '#fafafa', border: '1px solid #f0f2f5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1d3b', marginBottom: 10 }}>{TASK_LABELS[type]}</div>

              <label style={styles.label}>Department</label>
              <select style={styles.input} value={t.deptName} onChange={e => setTask(type, 'deptName', e.target.value)}>
                <option value=''>Select department…</option>
                {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Planned Start</label>
                  <input type="date" style={{ ...styles.input, marginBottom: 0 }}
                    value={t.startDate} onChange={e => setTask(type, 'startDate', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...styles.label, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t.useHours ? 'Hours' : 'Days'}</span>
                    <label style={{ fontWeight: 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <input type="checkbox" checked={t.useHours} onChange={e => setTask(type, 'useHours', e.target.checked)} />
                      use hours
                    </label>
                  </label>
                  <input type="number" min="1" style={{ ...styles.input, marginBottom: 0 }}
                    value={t.duration} onChange={e => setTask(type, 'duration', e.target.value)} />
                </div>
                {!t.useHours && (
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>End Date (calc.)</label>
                    <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fb', color: endDate ? '#555' : '#bbb', cursor: 'default' }}>
                      {endDate || '—'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <label style={styles.label}>Notes</label>
        <textarea style={{ ...styles.input, height: 56, resize: 'vertical' }}
          value={notes} onChange={e => setNotes(e.target.value)} />

        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  )
}
