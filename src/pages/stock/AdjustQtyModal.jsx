import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

export default function AdjustQtyModal({ item, onClose, onSave }) {
  const [mode, setMode] = useState('receive')
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const deltaNum = Number(delta) || 0
  const signedDelta = mode === 'receive' ? deltaNum : -deltaNum
  const newQty = Math.max(0, (item.qty || 0) + signedDelta)

  async function handleSave() {
    if (!deltaNum) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/stock/${item.id}/qty`, {
        method: 'PATCH',
        body: JSON.stringify({ delta: signedDelta, note }),
      })
      onSave()
    } catch {
      setError('Failed to adjust quantity.')
    } finally {
      setSaving(false)
    }
  }

  const btnBase = {
    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13,
    fontWeight: 600, cursor: 'pointer', border: '2px solid transparent',
  }
  const receiveStyle = {
    ...btnBase,
    background: mode === 'receive' ? '#e8f8f0' : '#f0f2f5',
    color: mode === 'receive' ? '#16a34a' : '#9298c4',
    borderColor: mode === 'receive' ? '#16a34a' : 'transparent',
  }
  const issueStyle = {
    ...btnBase,
    background: mode === 'issue' ? '#fef2f2' : '#f0f2f5',
    color: mode === 'issue' ? '#dc2626' : '#9298c4',
    borderColor: mode === 'issue' ? '#dc2626' : 'transparent',
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 380 }}>
        <h3 style={styles.modalTitle}>Adjust Quantity</h3>
        <p style={{ fontSize: 13, color: '#4a4f7a', marginBottom: 16 }}>
          <strong>{item.name}</strong> — Current:{' '}
          <span style={{ fontWeight: 700 }}>{item.qty} {item.unit}</span>
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={receiveStyle} onClick={() => setMode('receive')}>+ Receive</button>
          <button style={issueStyle} onClick={() => setMode('issue')}>− Issue</button>
        </div>

        <label style={styles.label}>Quantity {mode === 'receive' ? 'received' : 'issued'}</label>
        <input
          style={styles.input}
          type="number"
          min="0"
          value={delta}
          onChange={e => setDelta(e.target.value)}
          placeholder="0"
          autoFocus
        />

        {deltaNum > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0f2f5', borderRadius: 8, fontSize: 13 }}>
            New qty:{' '}
            <strong style={{ color: '#1a1d3b' }}>
              {item.qty} {mode === 'receive' ? '+' : '−'} {deltaNum} = {newQty} {item.unit}
            </strong>
          </div>
        )}

        <label style={styles.label}>
          Note <span style={{ fontWeight: 400, color: '#9298c4' }}>(optional)</span>
        </label>
        <input
          style={styles.input}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. PO-1234 received"
        />

        {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button
            style={{ ...styles.btnPrimary, opacity: saving || !deltaNum ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving || !deltaNum}
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
