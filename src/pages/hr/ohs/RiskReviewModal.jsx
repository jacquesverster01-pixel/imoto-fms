import { useState } from 'react'
import { apiFetch } from '../../../hooks/useApi'
import { riskRatingColour, riskRatingFromScore } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'

export default function RiskReviewModal({ risk, onClose, onSaved }) {
  const [likelihood, setLikelihood] = useState(risk.likelihood ?? 1)
  const [severity,   setSeverity]   = useState(risk.severity   ?? 1)
  const [note,       setNote]       = useState('')
  const [author,     setAuthor]     = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const newScore  = Number(likelihood) * Number(severity)
  const newRating = riskRatingFromScore(newScore)
  const col       = riskRatingColour(risk.riskRating || 'Low')

  async function handleSave() {
    if (!author.trim()) { setError('Author is required.'); return }
    setSaving(true)
    setError('')
    try {
      await apiFetch(`/ohs-risks/${risk.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author,
          note,
          reviewedItems: [{
            id: risk.id,
            newLikelihood: Number(likelihood),
            newSeverity:   Number(severity),
            newRating,
          }],
        }),
      })
      onSaved()
    } catch (err) {
      console.error('Review save failed:', err)
      setError('Save failed. Check the server is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 480 }}>
        <h3 style={styles.modalTitle}>Risk Review</h3>

        {/* Risk header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 12px', background: '#f9fafb', borderRadius: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b', flex: 1 }}>{risk.title}</span>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: col.bg, color: col.text, whiteSpace: 'nowrap' }}>
            {risk.riskRating} ({risk.riskScore ?? '—'})
          </span>
        </div>

        {/* Review scores */}
        <div style={{ background: '#f0f2f5', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Update Risk Scores
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={styles.label}>Likelihood (1–5)</label>
              <input type="number" min={1} max={5} style={styles.input}
                value={likelihood} onChange={e => setLikelihood(e.target.value)} />
            </div>
            <div>
              <label style={styles.label}>Severity (1–5)</label>
              <input type="number" min={1} max={5} style={styles.input}
                value={severity} onChange={e => setSeverity(e.target.value)} />
            </div>
            <div>
              <label style={styles.label}>New Score</label>
              <div style={{ padding: '7px 10px', borderRadius: 8, background: '#fff', border: '1px solid #e4e6ea', fontSize: 13, fontWeight: 700, color: '#1e1f3b' }}>
                {newScore} — {newRating}
              </div>
            </div>
          </div>
        </div>

        {/* Previous review notes */}
        {risk.reviewNotes && risk.reviewNotes.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Previous Reviews
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
              {[...risk.reviewNotes].reverse().map(rn => (
                <div key={rn.id} style={{ fontSize: 12, padding: '6px 10px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e4e6ea' }}>
                  <span style={{ fontWeight: 600, color: '#555' }}>{rn.date}</span>
                  {rn.author && <span style={{ color: '#888' }}> · {rn.author}</span>}
                  {rn.note && <div style={{ color: '#555', marginTop: 2 }}>{rn.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <label style={styles.label}>Reviewed by *</label>
        <input style={styles.input} placeholder="Your name" value={author} onChange={e => setAuthor(e.target.value)} />

        <label style={styles.label}>Review notes</label>
        <textarea
          style={{ ...styles.input, resize: 'vertical', minHeight: 72 }}
          placeholder="Observations, changes made, next steps…"
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
