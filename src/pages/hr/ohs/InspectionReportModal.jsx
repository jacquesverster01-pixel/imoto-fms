import { useGet } from '../../../hooks/useApi'
import { styles } from '../../../utils/hrStyles'

const UPLOADS_URL = 'http://localhost:3001/uploads'

function ResponseBadge({ response }) {
  if (!response) return <span style={{ fontSize: 11, color: '#aaa' }}>—</span>
  const map = {
    yes: { bg: '#dcfce7', text: '#166534', label: 'Yes' },
    no:  { bg: '#fee2e2', text: '#991b1b', label: 'No' },
    na:  { bg: '#f3f4f6', text: '#6b7280', label: 'N/A' },
  }
  const s = map[response] || map.na
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 10,
      background: s.bg, color: s.text,
    }}>
      {s.label}
    </span>
  )
}

export default function InspectionReportModal({ inspection, onClose }) {
  const { data: live } = useGet(`/ohs-inspections-active/${inspection.id}`)
  const current   = live || inspection
  const questions = current.questions || []

  const nonNA      = questions.filter(q => q.response && q.response !== 'na')
  const yesCount   = questions.filter(q => q.response === 'yes').length
  const scorePct   = nonNA.length > 0 ? Math.round(yesCount / nonNA.length * 100) : null
  const scoreColor = scorePct == null ? '#aaa' : scorePct >= 80 ? '#22c55e' : scorePct >= 60 ? '#eab308' : '#ef4444'
  const completedOn = current.completedAt ? current.completedAt.slice(0, 10) : current.dueDate

  return (
    <div style={styles.overlay}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e1f3b' }}>
                {current.assigneeName}
              </h3>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2, textTransform: 'capitalize' }}>
                {current.cadence} inspection · Completed {completedOn}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
              background: '#e8f5e9', color: '#166534',
            }}>
              Completed
            </span>
          </div>

          {scorePct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#666' }}>Score:</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{scorePct}%</span>
              <span style={{ fontSize: 11, color: '#aaa' }}>
                {yesCount} yes / {nonNA.length} applicable
              </span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {questions.map((q, i) => (
            <div key={q.questionId} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: '#aaa', minWidth: 22, textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#1e1f3b', lineHeight: 1.4 }}>{q.text}</span>
                    <ResponseBadge response={q.response} />
                  </div>
                  {q.photoPath && (
                    <img
                      src={`${UPLOADS_URL}/${q.photoPath}`}
                      alt="evidence"
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e4e6ea', marginBottom: 4, display: 'block' }}
                    />
                  )}
                  {q.note && (
                    <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2 }}>{q.note}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={styles.btnSecondary} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
