import { styles } from '../../utils/hrStyles'
import { UPLOADS_BASE as UPLOADS_URL } from '../../hooks/useApi'

export default function EmployeeDocSlots({ docSlots, existingDocs, pendingDocs, skippedDocs, setDoc, toggleSkip, employeeId }) {
  return (
    <>
      {docSlots.map(slot => {
        const existing  = existingDocs[slot.key]
        const pending   = pendingDocs[slot.key]
        const hasFile   = pending || existing?.file
        const isSkipped = !hasFile && skippedDocs.has(slot.key)
        return (
          <div key={slot.key} style={{ marginBottom: 10 }}>
            <label style={styles.label}>{slot.label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                background: hasFile ? '#f5f3ff' : isSkipped ? '#f0fdf4' : '#f8f9fb',
                color:      hasFile ? '#6c63ff' : isSkipped ? '#16a34a' : '#ccc',
                fontStyle:  isSkipped ? 'italic' : 'normal',
              }}>
                {pending ? pending.name : existing?.file ? existing.name : isSkipped ? 'Not required' : 'No file uploaded'}
              </div>
              {existing?.file && !pending && (
                <a
                  href={`${UPLOADS_URL}/${existing.file}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: '#6c63ff', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                >View</a>
              )}
              {!isSkipped && (
                <button
                  type="button"
                  style={{ ...styles.btnSecondary, padding: '5px 12px', fontSize: 12, flexShrink: 0 }}
                  onClick={() => document.getElementById(`doc-${employeeId}-${slot.key}`).click()}
                >{hasFile ? 'Replace' : 'Upload'}</button>
              )}
              {!hasFile && (
                <button
                  type="button"
                  style={{ ...styles.btnSmall, padding: '5px 10px', fontSize: 11, flexShrink: 0,
                    background: isSkipped ? '#f3f4f6' : '#fff7ed',
                    color:      isSkipped ? '#555'    : '#d97706',
                    border:     '1px solid',
                    borderColor: isSkipped ? '#e5e7eb' : '#fcd34d',
                  }}
                  onClick={() => toggleSkip(slot.key)}
                >{isSkipped ? 'Restore' : 'Skip'}</button>
              )}
              <input
                id={`doc-${employeeId}-${slot.key}`}
                type="file"
                style={{ display: 'none' }}
                onChange={e => e.target.files[0] && setDoc(slot.key, e.target.files[0])}
              />
            </div>
          </div>
        )
      })}
    </>
  )
}
