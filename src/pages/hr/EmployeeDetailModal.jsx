import { styles } from '../../utils/hrStyles'
import { UPLOADS_BASE as UPLOADS_URL } from '../../hooks/useApi'

const DOC_SLOTS = [
  { key: 'cv',             label: 'CV / Résumé' },
  { key: 'driversLicense', label: "Driver's Licence" },
  { key: 'contract',       label: 'Signed Contract' },
  { key: 'teamInfoSheet',  label: 'Team Info Sheet' },
  { key: 'workPermit',     label: 'Work Permit' },
]

export default function EmployeeDetailModal({ employee: emp, onClose, onEdit }) {
  const initials = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: emp.color || '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1e1f3b' }}>{emp.name}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{emp.id}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1, padding: '4px 8px' }}>✕</button>
        </div>

        {[
          { label: 'Employee ID',    value: emp.id,                        mono: true },
          { label: 'Department',     value: emp.dept,                      warn: !emp.dept },
          { label: 'Shift',          value: emp.shift },
          { label: 'Hourly rate',    value: emp.hourlyRate != null ? `R ${Number(emp.hourlyRate).toFixed(2)}` : null },
          { label: 'ID / Passport',  value: emp.idNumber },
          { label: 'Tax number',     value: emp.taxNumber },
          { label: 'Biometric ID',   value: emp.zkUserId,                  mono: true, badge: true },
        ].map((row, i, arr) => (row.value || row.warn) ? (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#fafafa', borderRadius: i === 0 ? '8px 8px 0 0' : i === arr.filter(r => r.value || r.warn).length - 1 ? '0 0 8px 8px' : 0, borderBottom: '1px solid #f0f2f5' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#888', width: 120, flexShrink: 0 }}>{row.label}</span>
            {row.badge
              ? <span style={{ fontSize: 12, fontFamily: 'monospace', background: '#f5f3ff', color: '#6c63ff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{row.value}</span>
              : <span style={{ fontSize: 13, color: row.warn ? '#f59e0b' : '#1e1f3b', fontFamily: row.mono ? 'monospace' : 'inherit', fontWeight: row.mono ? 600 : 400 }}>{row.value || 'Not set'}</span>
            }
          </div>
        ) : null)}

        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Documents</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DOC_SLOTS.map(slot => {
              const doc = (emp.documents || {})[slot.key]
              if (doc?.file) return (
                <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f5f3ff', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#6c63ff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>{slot.label}</span>
                  <a href={`${UPLOADS_URL}/${doc.file}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: '#6c63ff', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>View</a>
                </div>
              )
              if (doc?.skipped) return (
                <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#16a34a', flex: 1, fontStyle: 'italic' }}>Not required</span>
                  <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>{slot.label}</span>
                </div>
              )
              return (
                <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff7ed', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#d97706', flex: 1 }}>Missing</span>
                  <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>{slot.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop: 16, marginBottom: 20 }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={onClose}>Close</button>
          <button style={{ ...styles.btnPrimary, flex: 1 }} onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  )
}
