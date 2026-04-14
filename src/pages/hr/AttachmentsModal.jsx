import { styles } from '../../utils/hrStyles'

const UPLOADS_URL = 'http://localhost:3001/uploads'

export default function AttachmentsModal({ record, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ ...styles.modalTitle, marginBottom: 0 }}>Attachments</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1 }}>✕</button>
        </div>
        {(!record.attachments || record.attachments.length === 0) ? (
          <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No attachments</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {record.attachments.map((att, i) => {
              const name = att.name || att
              const file = att.file || att
              return (
                <a
                  key={i}
                  href={`${UPLOADS_URL}/${file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8, border: '1px solid #e4e6ea',
                    color: '#6c63ff', fontSize: 13, textDecoration: 'none',
                  }}
                >
                  📎 {name}
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
