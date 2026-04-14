import { useState } from 'react'
import { styles } from '../../utils/hrStyles'

export default function DiscDeleteModal({ onClose, onConfirm }) {
  const [busy, setBusy] = useState(false)
  async function handleDelete() {
    setBusy(true)
    await onConfirm()
    setBusy(false)
    onClose()
  }
  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 360 }}>
        <h3 style={{ ...styles.modalTitle, color: '#dc2626' }}>Delete record?</h3>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
          This will permanently delete this disciplinary record. This cannot be undone.
        </p>
        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose} disabled={busy}>Cancel</button>
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{ ...styles.btnPrimary, background: '#dc2626' }}
          >
            {busy ? 'Deleting…' : 'Delete record'}
          </button>
        </div>
      </div>
    </div>
  )
}
