import { useState } from 'react'
import { apiFetch } from '../../../hooks/useApi'

const UPLOADS_URL = 'http://localhost:3001/uploads'

const RESPONSE_BTNS = [
  { value: 'yes', label: 'Yes', bg: '#dcfce7', active: '#22c55e', text: '#166534' },
  { value: 'no',  label: 'No',  bg: '#fee2e2', active: '#ef4444', text: '#991b1b' },
  { value: 'na',  label: 'N/A', bg: '#f3f4f6', active: '#6b7280', text: '#374151' },
]

export default function InspectionQuestionItem({ inspectionId, question, index, onAnswered }) {
  const [response,     setResponse]     = useState(question.response   || null)
  const [note,         setNote]         = useState(question.note       || '')
  const [photoPath,    setPhotoPath]    = useState(question.photoPath  || null)
  const [noteOpen,     setNoteOpen]     = useState(false)
  const [uploading,    setUploading]    = useState(false)

  async function saveAnswer(updates) {
    const merged = { questionId: question.questionId, response, note, photoPath, ...updates }
    await apiFetch(`/ohs-inspections-active/${inspectionId}/answers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [merged] }),
    })
    onAnswered()
  }

  async function handleResponse(val) {
    setResponse(val)
    await saveAnswer({ response: val })
  }

  async function handleNoteBlur() {
    await saveAnswer({ note })
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await apiFetch(`/ohs-inspections-active/${inspectionId}/photo`, {
        method: 'POST',
        body: fd,
      })
      setPhotoPath(result.filename)
      await saveAnswer({ photoPath: result.filename })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #e4e6ea', borderRadius: 10,
      padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: '#aaa', minWidth: 22, textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>
          {index + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: '#1e1f3b', lineHeight: 1.4, marginBottom: 10 }}>
            {question.text}
            {question.requiresPhoto && (
              <span style={{ fontSize: 11, color: '#6c63ff', marginLeft: 6 }}>📷 required</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {RESPONSE_BTNS.map(btn => {
              const isActive = response === btn.value
              return (
                <button
                  key={btn.value}
                  onClick={() => handleResponse(btn.value)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 14,
                    background: isActive ? btn.active : btn.bg,
                    color: isActive ? '#fff' : btn.text,
                    transition: 'all 0.15s',
                  }}
                >
                  {btn.label}
                </button>
              )
            })}
          </div>

          {question.requiresPhoto && (
            <div style={{ marginBottom: 8 }}>
              {photoPath ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img
                    src={`${UPLOADS_URL}/${photoPath}`}
                    alt="evidence"
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e4e6ea' }}
                  />
                  <label style={{ fontSize: 12, color: '#6c63ff', cursor: 'pointer' }}>
                    Replace
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
                  </label>
                </div>
              ) : (
                <label style={{
                  display: 'inline-block', padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  background: '#ede9fe', color: '#5b21b6', fontSize: 13, fontWeight: 600,
                }}>
                  {uploading ? 'Uploading…' : '📷 Add Photo'}
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} disabled={uploading} />
                </label>
              )}
            </div>
          )}

          <button
            onClick={() => setNoteOpen(o => !o)}
            style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {noteOpen ? '▲ Hide note' : '▼ Add note'}
          </button>
          {noteOpen && (
            <textarea
              style={{
                display: 'block', width: '100%', marginTop: 6, fontSize: 13,
                border: '1px solid #e4e6ea', borderRadius: 6, padding: '8px 10px',
                resize: 'vertical', minHeight: 56, fontFamily: 'inherit', boxSizing: 'border-box',
              }}
              placeholder="Optional note…"
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={handleNoteBlur}
            />
          )}
        </div>
      </div>
    </div>
  )
}
