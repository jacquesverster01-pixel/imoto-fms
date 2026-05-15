import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

export default function CheckoutModal({ tool, employees, onClose, onConfirm }) {
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const selectedEmp = employees.find(e => e.id === selectedId)

  async function handleConfirm() {
    if (!selectedId || !selectedEmp) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/tools/${tool.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ employeeId: selectedEmp.id, employeeName: selectedEmp.name }),
      })
      onConfirm()
    } catch {
      setError('Checkout failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>Check Out Tool</h3>
        <p style={{ fontSize: 13, color: '#4a4f7a', marginBottom: 16 }}>
          <strong>{tool.name}</strong>
          {tool.serial && <span style={{ color: '#9298c4' }}> · {tool.serial}</span>}
        </p>

        <label style={styles.label}>Check out to *</label>
        <select style={styles.input} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          <option value="">— select employee —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button
            style={{ ...styles.btnPrimary, opacity: saving || !selectedId ? 0.6 : 1 }}
            onClick={handleConfirm}
            disabled={saving || !selectedId}
          >
            {saving ? 'Processing…' : 'Check Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
