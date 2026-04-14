import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

const AVATAR_COLOURS = ['#6c63ff','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6','#84cc16']

export default function ImportFromDeviceModal({ existingEmployees, onClose, onImported }) {
  const [zkUsers, setZkUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await apiFetch('/zk/users')
        const users = res.users || []
        const enrolledIds = new Set(existingEmployees.map(e => String(e.zkUserId)).filter(Boolean))
        const sel = {}
        users.forEach(u => {
          sel[u.userId] = !enrolledIds.has(String(u.userId))
        })
        setZkUsers(users)
        setSelected(sel)
      } catch (e) {
        setError('Could not fetch users from device. Is it online?')
      }
      setLoading(false)
    }
    load()
  }, [])

  function toggleAll(val) {
    const sel = {}
    zkUsers.forEach(u => { sel[u.userId] = val })
    setSelected(sel)
  }

  async function handleImport() {
    const toImport = zkUsers.filter(u => selected[u.userId])
    if (!toImport.length) return
    setImporting(true)

    const enrolledIds = new Set(existingEmployees.map(e => String(e.zkUserId)).filter(Boolean))
    let created = 0
    let skipped = 0

    for (let i = 0; i < toImport.length; i++) {
      const u = toImport[i]
      if (enrolledIds.has(String(u.userId))) { skipped++; continue }
      const colour = AVATAR_COLOURS[i % AVATAR_COLOURS.length]
      await apiFetch('/employees', {
        method: 'POST',
        body: JSON.stringify({
          name: u.name || `User ${u.userId}`,
          dept: '',
          color: colour,
          zkUserId: String(u.userId)
        })
      })
      created++
    }

    setImporting(false)
    setResult({ created, skipped })
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const enrolledIds = new Set(existingEmployees.map(e => String(e.zkUserId)).filter(Boolean))

  if (result) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h3 style={styles.modalTitle}>Import Complete</h3>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>{result.created}</div>
            <div style={{ fontSize: 13, color: '#16a34a' }}>employees created</div>
            {result.skipped > 0 && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{result.skipped} skipped (already enrolled)</div>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
            You can now set their departments using the <strong>Edit</strong> button in the topbar, or by going to each employee card.
          </p>
          <div style={styles.modalBtns}>
            <button style={styles.btnPrimary} onClick={() => { onImported(); onClose() }}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 460 }}>
        <h3 style={styles.modalTitle}>Import Employees from Device</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          Select which ZKTeco users to create as FMS employees. Department can be set afterwards.
        </p>

        {loading && <p style={{ fontSize: 13, color: '#aaa', padding: '20px 0' }}>Loading users from device…</p>}
        {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}

        {!loading && !error && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button style={{ ...styles.btnSecondary, fontSize: 12, padding: '4px 10px' }} onClick={() => toggleAll(true)}>Select all</button>
              <button style={{ ...styles.btnSecondary, fontSize: 12, padding: '4px 10px' }} onClick={() => toggleAll(false)}>Deselect all</button>
              <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto', alignSelf: 'center' }}>{selectedCount} selected</span>
            </div>

            <div style={{ border: '1px solid #e4e6ea', borderRadius: 8, overflow: 'hidden', marginBottom: 20, maxHeight: 320, overflowY: 'auto' }}>
              {zkUsers.map((u, i) => {
                const alreadyEnrolled = enrolledIds.has(String(u.userId))
                const isSelected = !!selected[u.userId]
                return (
                  <div
                    key={u.userId}
                    onClick={() => !alreadyEnrolled && setSelected(s => ({ ...s, [u.userId]: !s[u.userId] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      borderBottom: i < zkUsers.length - 1 ? '1px solid #f0f2f5' : 'none',
                      background: alreadyEnrolled ? '#fafafa' : isSelected ? '#f5f3ff' : '#fff',
                      cursor: alreadyEnrolled ? 'default' : 'pointer',
                      opacity: alreadyEnrolled ? 0.6 : 1
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isSelected && !alreadyEnrolled ? '#6c63ff' : '#d1d5db'}`,
                      background: isSelected && !alreadyEnrolled ? '#6c63ff' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && !alreadyEnrolled && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: AVATAR_COLOURS[i % AVATAR_COLOURS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 12
                    }}>
                      {(u.name || `U${u.userId}`).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name || `(no name)`}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>ZK ID: {u.userId}</div>
                    </div>
                    {alreadyEnrolled && (
                      <span style={{ ...styles.pill, background: '#f0fdf4', color: '#16a34a', fontSize: 10 }}>Already enrolled</span>
                    )}
                  </div>
                )
              })}
              {zkUsers.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#ccc', fontSize: 13 }}>No users found on device</div>
              )}
            </div>
          </>
        )}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button
            style={{ ...styles.btnPrimary, opacity: selectedCount > 0 && !loading ? 1 : 0.5 }}
            onClick={handleImport}
            disabled={importing || selectedCount === 0 || loading}
          >
            {importing ? 'Creating…' : `Import ${selectedCount} employee${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
