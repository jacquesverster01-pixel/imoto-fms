import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { todayStr } from '../../../utils/time'
import { styles } from '../../../utils/hrStyles'
import { ohsRiskColour, ohsSeverityLabel, ohsLikelihoodLabel } from '../../../utils/ohs'

export default function AddIncidentModal({ incident, onClose, onSaved }) {
  const { data: settingsData } = useGet('/settings')
  const { data: zonesData }    = useGet('/ohs-zones')
  const departments = settingsData?.departments || []
  const zones       = zonesData?.zones || []

  const [type, setType] = useState(incident?.type || 'Hazard')
  const [title, setTitle] = useState(incident?.title || '')
  const [description, setDescription] = useState(incident?.description || '')
  const [reportedBy, setReportedBy] = useState(incident?.reportedBy || '')
  const [department, setDepartment] = useState(incident?.department || '')
  const [location, setLocation] = useState(incident?.location || '')
  const [zoneId, setZoneId] = useState(incident?.zoneId || '')
  const [severity, setSeverity] = useState(incident?.severity ?? 3)
  const [likelihood, setLikelihood] = useState(incident?.likelihood ?? 2)
  const [date, setDate] = useState(incident?.date || todayStr())
  const [status, setStatus] = useState(incident?.status || 'Open')
  const [saving, setSaving] = useState(false)

  const riskScore = Number(severity) * Number(likelihood)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { type, title, description, reportedBy, department, location, zoneId: zoneId || null,
        severity: Number(severity), likelihood: Number(likelihood), riskScore, date, status }
      if (incident) {
        await apiFetch(`/ohs/${incident.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await apiFetch('/ohs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      onSaved()
    } catch (err) {
      console.error('OHS save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalTitle}>{incident ? 'Edit Incident' : 'Report Incident'}</div>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Type</label>
          <select style={styles.input} value={type} onChange={e => setType(e.target.value)}>
            {['Hazard', 'Near Miss', 'Injury', 'Property Damage', 'Environmental'].map(t => <option key={t}>{t}</option>)}
          </select>

          <label style={styles.label}>Title</label>
          <input style={styles.input} required value={title} onChange={e => setTitle(e.target.value)} placeholder="Short title" />

          <label style={styles.label}>Description</label>
          <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Full description" />

          <label style={styles.label}>Reported By</label>
          <input style={styles.input} value={reportedBy} onChange={e => setReportedBy(e.target.value)} placeholder="Employee name" />

          <label style={styles.label}>Department</label>
          <select style={styles.input} value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">— Select —</option>
            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>

          <label style={styles.label}>Location</label>
          <input style={styles.input} value={location} onChange={e => setLocation(e.target.value)} placeholder="Location in factory" />

          <label style={styles.label}>Factory Zone</label>
          <select style={styles.input} value={zoneId} onChange={e => setZoneId(e.target.value)}>
            <option value="">— None —</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Severity (1–5) — {ohsSeverityLabel(severity)}</label>
              <input style={styles.input} type="number" min={1} max={5} value={severity} onChange={e => setSeverity(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Likelihood (1–5) — {ohsLikelihoodLabel(likelihood)}</label>
              <input style={styles.input} type="number" min={1} max={5} value={likelihood} onChange={e => setLikelihood(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f8f8f8', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Risk Score:</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: ohsRiskColour(riskScore) }}>{riskScore}</span>
            <span style={{ fontSize: 11, color: '#888' }}>(severity × likelihood)</span>
          </div>

          <label style={styles.label}>Date</label>
          <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />

          <label style={styles.label}>Status</label>
          <select style={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
            {['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'].map(s => <option key={s}>{s}</option>)}
          </select>

          <div style={styles.modalBtns}>
            <button type="button" style={styles.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" style={styles.btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
