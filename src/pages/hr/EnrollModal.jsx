import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

export default function EnrollModal({ employee, onClose, onSaved }) {
  const [zkUsers, setZkUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await apiFetch('/zk/users')
        setZkUsers(res.users || [])
      } catch (e) {
        setError('Could not fetch users from device. Is it online?')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    await apiFetch('/zk/enroll', {
      method: 'POST',
      body: JSON.stringify({ employeeId: employee.id, zkUserId: selected })
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>Enroll — {employee.name}</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          Select which ZKTeco user ID to link to this employee.
          {employee.zkUserId && <span style={{ color: '#6c63ff' }}> Currently linked to ZK ID: {employee.zkUserId}</span>}
        </p>

        {loading && <p style={{ fontSize: 13, color: '#888' }}>Loading device users…</p>}
        {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}

        {!loading && !error && (
          <>
            <label style={styles.label}>ZKTeco users on device</label>
            <select style={styles.input} value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">— select ZK user —</option>
              {zkUsers.map(u => (
                <option key={u.userId} value={u.userId}>
                  ID {u.userId} — {u.name || '(no name)'}
                </option>
              ))}
            </select>
          </>
        )}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving || !selected || loading}>
            {saving ? 'Saving…' : 'Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
