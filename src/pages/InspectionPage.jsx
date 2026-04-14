import { useState, useEffect } from 'react'
import { apiFetch } from '../hooks/useApi'
import { inspectionProgress, inspectionStatusColour } from '../utils/ohs'
import InspectionQuestionItem from './hr/ohs/InspectionQuestionItem'

export default function InspectionPage({ inspectionId }) {
  const [inspection, setInspection] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  async function load() {
    try {
      const data = await apiFetch(`/ohs-inspections-active/${inspectionId}`)
      setInspection(data)
    } catch {
      setError('Could not load inspection. Check the server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [inspectionId])

  function handleAnswered() {
    load()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
        <div style={{ fontSize: 15, color: '#888' }}>Loading inspection…</div>
      </div>
    )
  }

  if (error || !inspection) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
        <div style={{ fontSize: 15, color: '#dc2626' }}>{error || 'Inspection not found.'}</div>
      </div>
    )
  }

  const questions = inspection.questions || []
  const { answered, total, percent } = inspectionProgress(inspection)
  const col = inspectionStatusColour(inspection.status)

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '0 0 40px' }}>
      <div style={{
        background: '#fff', padding: '16px 20px', borderBottom: '1px solid #e4e6ea',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e1f3b' }}>{inspection.assigneeName}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              {inspection.cadence} inspection · Due {inspection.dueDate}
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
            background: col.bg, color: col.text, textTransform: 'capitalize',
          }}>
            {inspection.status}
          </span>
        </div>

        <div style={{ maxWidth: 560, margin: '10px auto 0' }}>
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

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
        {inspection.status === 'completed' ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: '#e8f5e9', borderRadius: 14, color: '#166534',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Inspection Completed</div>
            <div style={{ fontSize: 14, marginTop: 6, opacity: 0.8 }}>
              All {total} questions answered. Thank you!
            </div>
          </div>
        ) : (
          <div>
            {questions.map((q, i) => (
              <InspectionQuestionItem
                key={q.questionId}
                inspectionId={inspection.id}
                question={q}
                index={i}
                onAnswered={handleAnswered}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
