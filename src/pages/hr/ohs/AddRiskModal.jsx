import { useState } from 'react'
import { apiFetch } from '../../../hooks/useApi'
import { styles } from '../../../utils/hrStyles'
import { riskRatingFromScore, riskRatingColour } from '../../../utils/ohs'

const CATEGORIES = ['Health','Safety','Environmental','Operational','Compliance','Other']
const STATUSES   = ['Open','Under Review','Controlled','Closed']
const LIKELIHOOD_LABELS = { 1:'Rare', 2:'Unlikely', 3:'Possible', 4:'Likely', 5:'Almost Certain' }
const SEVERITY_LABELS   = { 1:'Negligible', 2:'Minor', 3:'Moderate', 4:'Major', 5:'Catastrophic' }

function ScoreDisplay({ label, score, rating }) {
  const col = riskRatingColour(rating)
  return (
    <div style={{ background: '#f7f8fa', border: '1px solid #e4e6ea', borderRadius: 8, padding: '8px 12px', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#888' }}>{label}:</span>
      <strong style={{ fontSize: 14 }}>{score}</strong>
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: col.bg, color: col.text }}>{rating}</span>
    </div>
  )
}

export default function AddRiskModal({ risk, onClose, onSaved, departments = [] }) {
  const isNew = !risk
  const [form, setForm] = useState({
    title:               risk?.title               || '',
    description:         risk?.description         || '',
    category:            risk?.category            || 'Safety',
    department:          risk?.department          || '',
    location:            risk?.location            || '',
    likelihood:          risk?.likelihood          ?? 3,
    severity:            risk?.severity            ?? 3,
    controls:            risk?.controls            || '',
    residualLikelihood:  risk?.residualLikelihood  ?? 2,
    residualSeverity:    risk?.residualSeverity    ?? 2,
    owner:               risk?.owner               || '',
    reviewDate:          risk?.reviewDate          || '',
    status:              risk?.status              || 'Open',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function f(key)    { return e => setForm(p => ({ ...p, [key]: e.target.value })) }
  function fNum(key) { return e => setForm(p => ({ ...p, [key]: Number(e.target.value) })) }

  const score          = Number(form.likelihood) * Number(form.severity)
  const rating         = riskRatingFromScore(score)
  const residualScore  = Number(form.residualLikelihood) * Number(form.residualSeverity)
  const residualRating = riskRatingFromScore(residualScore)

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        likelihood: Number(form.likelihood), severity: Number(form.severity),
        residualLikelihood: Number(form.residualLikelihood), residualSeverity: Number(form.residualSeverity),
      }
      if (isNew) {
        await apiFetch('/ohs-risks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await apiFetch(`/ohs-risks/${risk.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      onSaved()
    } catch (err) {
      console.error('Save risk failed:', err)
      setError('Save failed. Check the server is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={styles.modalTitle}>{isNew ? 'Add Risk' : 'Edit Risk'}</h3>
        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <label style={styles.label}>Title *</label>
        <input style={styles.input} value={form.title} onChange={f('title')} placeholder="e.g. Exposure to welding fumes" />

        <label style={styles.label}>Description</label>
        <textarea style={{ ...styles.input, resize: 'vertical', minHeight: 56 }} value={form.description} onChange={f('description')} placeholder="Describe the hazard or risk scenario…" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Category</label>
            <select style={styles.input} value={form.category} onChange={f('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Department</label>
            <select style={styles.input} value={form.department} onChange={f('department')}>
              <option value="">— select —</option>
              {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <label style={styles.label}>Location</label>
        <input style={styles.input} value={form.location} onChange={f('location')} placeholder="e.g. Welding Bay" />

        {/* Inherent Risk */}
        <div style={{ border: '1px solid #e4e6ea', borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Inherent Risk (before controls)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={styles.label}>Likelihood</label>
              <select style={styles.input} value={form.likelihood} onChange={fNum('likelihood')}>
                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} — {LIKELIHOOD_LABELS[v]}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Severity</label>
              <select style={styles.input} value={form.severity} onChange={fNum('severity')}>
                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} — {SEVERITY_LABELS[v]}</option>)}
              </select>
            </div>
          </div>
          <ScoreDisplay label="Risk Score" score={score} rating={rating} />
        </div>

        <label style={styles.label}>Controls</label>
        <textarea style={{ ...styles.input, resize: 'vertical', minHeight: 56 }} value={form.controls} onChange={f('controls')} placeholder="Describe control measures in place…" />

        {/* Residual Risk */}
        <div style={{ border: '1px solid #e4e6ea', borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Residual Risk (after controls)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={styles.label}>Residual Likelihood</label>
              <select style={styles.input} value={form.residualLikelihood} onChange={fNum('residualLikelihood')}>
                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} — {LIKELIHOOD_LABELS[v]}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Residual Severity</label>
              <select style={styles.input} value={form.residualSeverity} onChange={fNum('residualSeverity')}>
                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} — {SEVERITY_LABELS[v]}</option>)}
              </select>
            </div>
          </div>
          <ScoreDisplay label="Residual Score" score={residualScore} rating={residualRating} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Owner</label>
            <input style={styles.input} value={form.owner} onChange={f('owner')} placeholder="Responsible person" />
          </div>
          <div>
            <label style={styles.label}>Review Date</label>
            <input type="date" style={styles.input} value={form.reviewDate} onChange={f('reviewDate')} />
          </div>
        </div>

        <label style={styles.label}>Status</label>
        <select style={styles.input} value={form.status} onChange={f('status')}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Add Risk' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
