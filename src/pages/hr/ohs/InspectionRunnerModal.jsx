import { useGet } from '../../../hooks/useApi'
import { inspectionProgress, inspectionStatusColour } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'
import InspectionQuestionItem from './InspectionQuestionItem'

export default function InspectionRunnerModal({ inspection, onClose }) {
  const { data: live, refetch } = useGet(`/ohs-inspections-active/${inspection.id}`)

  const current   = live || inspection
  const questions = current.questions || []
  const { answered, total, percent } = inspectionProgress(current)
  const col       = inspectionStatusColour(current.status)

  function handleAnswered() {
    refetch()
  }

  return (
    <div style={styles.overlay}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e1f3b' }}>
                {current.assigneeName}
              </h3>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {current.cadence} · Due {current.dueDate}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
              background: col.bg, color: col.text, textTransform: 'capitalize',
            }}>
              {current.status}
            </span>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
              <span>{answered} of {total} answered</span>
              <span>{percent}%</span>
            </div>
            <div style={{ height: 8, background: '#e4e6ea', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${percent}%`,
                background: percent === 100 ? '#22c55e' : '#6c63ff',
                borderRadius: 4, transition: 'width 0.3s',
              }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {current.status === 'completed' ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              background: '#e8f5e9', borderRadius: 12, color: '#166534',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Inspection Completed</div>
              <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>
                All {total} questions answered
              </div>
            </div>
          ) : (
            <div>
              {questions.map((q, i) => (
                <InspectionQuestionItem
                  key={q.questionId}
                  inspectionId={current.id}
                  question={q}
                  index={i}
                  onAnswered={handleAnswered}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={styles.btnSecondary} onClick={onClose}>
            {current.status === 'completed' ? 'Close' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
