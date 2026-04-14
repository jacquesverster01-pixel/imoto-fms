import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'
import ImportFromDeviceModal from './ImportFromDeviceModal'
import EnrollModal from './EnrollModal'

// ImportFromDeviceModal → ./ImportFromDeviceModal.jsx
// EnrollModal           → ./EnrollModal.jsx

// ─── BiometricTab ─────────────────────────────────────────────────────────────

export default function BiometricTab({ employees, refetchEmployees }) {
  const [deviceStatus, setDeviceStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [reconnecting, setReconnecting] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pullResult, setPullResult] = useState(null)
  const [enrollTarget, setEnrollTarget] = useState(null)
  const [showImport, setShowImport] = useState(false)

  const checkStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const res = await apiFetch('/zk/status')
      setDeviceStatus(res)
    } catch (e) {
      setDeviceStatus({ online: false })
    }
    setStatusLoading(false)
  }, [])

  async function handleReconnect() {
    setReconnecting(true)
    try {
      const res = await apiFetch('/zk/reconnect', { method: 'POST' })
      setDeviceStatus(res)
    } catch {
      setDeviceStatus({ online: false })
    }
    setReconnecting(false)
  }

  useEffect(() => { checkStatus() }, [checkStatus])

  async function handlePull() {
    setPulling(true)
    setPullResult(null)
    try {
      const res = await apiFetch('/zk/pull', { method: 'POST' })
      setPullResult(res)
    } catch (e) {
      setPullResult({ error: 'Pull failed. Device may be offline.' })
    }
    setPulling(false)
  }

  function handleEnrollSaved() {
    setEnrollTarget(null)
    refetchEmployees()
  }

  const isOnline = deviceStatus?.online

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {enrollTarget && (
        <EnrollModal
          employee={enrollTarget}
          onClose={() => setEnrollTarget(null)}
          onSaved={handleEnrollSaved}
        />
      )}
      {showImport && (
        <ImportFromDeviceModal
          existingEmployees={employees}
          onClose={() => setShowImport(false)}
          onImported={refetchEmployees}
        />
      )}

      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={styles.cardTitle}>ZKTeco Device</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.btnSecondary} onClick={handleReconnect} disabled={reconnecting || statusLoading}>
              {reconnecting ? 'Reconnecting…' : 'Reconnect'}
            </button>
            <button style={styles.btnSecondary} onClick={checkStatus} disabled={statusLoading || reconnecting}>
              {statusLoading ? 'Checking…' : 'Refresh'}
            </button>
          </div>
        </div>

        {statusLoading ? (
          <p style={{ fontSize: 13, color: '#aaa' }}>Checking device…</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444' }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: isOnline ? '#16a34a' : '#ef4444' }}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {isOnline && deviceStatus?.info && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={styles.statPill}>IP: {deviceStatus.info.ip || '192.168.1.201'}</span>
                {deviceStatus.info.model && <span style={styles.statPill}>{deviceStatus.info.model}</span>}
                {deviceStatus.info.firmware && <span style={styles.statPill}>FW {deviceStatus.info.firmware}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h3 style={styles.cardTitle}>Pull Historical Logs</h3>
            <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Import all stored attendance records from the device into the time log.</p>
          </div>
          <button
            style={{ ...styles.btnPrimary, opacity: isOnline ? 1 : 0.5 }}
            onClick={handlePull}
            disabled={pulling || !isOnline}
          >
            {pulling ? 'Pulling…' : 'Pull Now'}
          </button>
        </div>

        {pullResult && (
          <div style={{ background: pullResult.error ? '#fff3f3' : '#f0fdf4', border: `1px solid ${pullResult.error ? '#fca5a5' : '#86efac'}`, borderRadius: 8, padding: 12, fontSize: 13 }}>
            {pullResult.error ? (
              <span style={{ color: '#ef4444' }}>{pullResult.error}</span>
            ) : (
              <span style={{ color: '#16a34a' }}>
                ✓ {pullResult.imported ?? 0} imported · {pullResult.skipped ?? 0} skipped (duplicates) · {pullResult.unmatched ?? 0} unmatched (no employee link)
              </span>
            )}
          </div>
        )}

        {!isOnline && !statusLoading && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>⚠ Device is offline — pull not available.</p>
        )}
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
          <div>
            <h3 style={styles.cardTitle}>Employee Enrollment</h3>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4, marginBottom: 0 }}>
              Link each FMS employee to their fingerprint template on the ZKTeco device.
            </p>
          </div>
          <button
            style={{ ...styles.btnPrimary, whiteSpace: 'nowrap', flexShrink: 0, opacity: isOnline ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}
            onClick={() => setShowImport(true)}
            disabled={!isOnline}
            title={isOnline ? 'Import employees from ZKTeco device' : 'Device must be online to import'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 17.5a14.5 14.5 0 0 0 4.27 6"/><path d="M22 12a10 10 0 0 1-1.18 4.6"/><path d="M5 19.5C5.81 21 7 22 9 22"/><path d="M6 12a6 6 0 0 1 11.17-3"/></svg>
            Import from Device
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
          <thead>
            <tr style={{ background: '#f8f9fb' }}>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>ZK User ID</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#aaa', fontSize: 13 }}>
                  No employees yet — use <strong style={{ color: '#6c63ff' }}>Import from Device</strong> above (device must be online), or add manually via the <strong>+ Add</strong> button.
                </td>
              </tr>
            )}
            {employees.map((emp, i) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f0f2f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: emp.color || '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>
                      {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    {emp.name}
                  </div>
                </td>
                <td style={styles.td}>{emp.dept}</td>
                <td style={styles.td}>
                  {emp.zkUserId
                    ? <span style={{ fontFamily: 'monospace', background: '#f5f3ff', color: '#6c63ff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{emp.zkUserId}</span>
                    : <span style={{ color: '#ccc' }}>—</span>
                  }
                </td>
                <td style={styles.td}>
                  {emp.zkUserId
                    ? <span style={{ ...styles.pill, background: '#f0fdf4', color: '#16a34a' }}>✓ Enrolled</span>
                    : <span style={{ ...styles.pill, background: '#fef9ec', color: '#d97706' }}>Not enrolled</span>
                  }
                </td>
                <td style={styles.td}>
                  <button
                    style={{ ...styles.btnSmall, background: emp.zkUserId ? '#f5f3ff' : '#6c63ff', color: emp.zkUserId ? '#6c63ff' : '#fff', border: emp.zkUserId ? '1px solid #d8d4ff' : 'none' }}
                    onClick={() => setEnrollTarget(emp)}
                  >
                    {emp.zkUserId ? 'Re-enroll' : 'Enroll'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
