import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { styles } from '../../../utils/hrStyles'
import InspectionPreviewModal from './InspectionPreviewModal'

const CADENCES = ['weekly', 'monthly', 'quarterly']

const PANEL_COLOURS = {
  weekly:    { header: '#e3f2fd', accent: '#1565c0' },
  monthly:   { header: '#f3e5f5', accent: '#6a1b9a' },
  quarterly: { header: '#e8f5e9', accent: '#2e7d32' },
}

function QuestionRow({ q, onToggleActive, onTogglePhoto, onEditSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText]       = useState(q.text)

  function commitEdit() {
    setEditing(false)
    if (text.trim() && text.trim() !== q.text) onEditSave(q.id, text.trim())
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            style={{ ...styles.input, marginBottom: 0, fontSize: 13 }}
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          />
        ) : (
          <span style={{ fontSize: 13, color: q.active ? '#1e1f3b' : '#aaa', lineHeight: 1.4 }}>{q.text}</span>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 11, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={!!q.requiresPhoto} onChange={() => onTogglePhoto(q.id, !q.requiresPhoto)} />
            Requires photo
          </label>
          <label style={{ fontSize: 11, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={q.active !== false} onChange={() => onToggleActive(q.id, !(q.active !== false))} />
            Active
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555' }} onClick={() => setEditing(true)}>Edit</button>
        <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#991b1b' }} onClick={() => onDelete(q.id)}>Del</button>
      </div>
    </div>
  )
}

function AddQuestionForm({ cadence, onAdd, onCancel }) {
  const [text,          setText]          = useState('')
  const [requiresPhoto, setRequiresPhoto] = useState(false)

  return (
    <div style={{ padding: '10px 0' }}>
      <input
        autoFocus
        style={{ ...styles.input, fontSize: 13 }}
        placeholder="Question text…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <label style={{ fontSize: 11, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        <input type="checkbox" checked={requiresPhoto} onChange={e => setRequiresPhoto(e.target.checked)} />
        Requires photo
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={styles.btnPrimary} onClick={() => { if (text.trim()) onAdd(cadence, text.trim(), requiresPhoto) }}>Add</button>
        <button style={styles.btnSecondary} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default function InspectionTemplatesTab() {
  const { data: tmplData, refetch } = useGet('/ohs-inspection-templates')
  const templates = {
    weekly:    tmplData?.weekly    || [],
    monthly:   tmplData?.monthly   || [],
    quarterly: tmplData?.quarterly || [],
  }

  const [addingCadence,  setAddingCadence]  = useState(null)
  const [previewCadence, setPreviewCadence] = useState(null)

  async function handleAdd(cadence, text, requiresPhoto) {
    await apiFetch('/ohs-inspection-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cadence, text, requiresPhoto }),
    })
    setAddingCadence(null)
    refetch()
  }

  async function handleEditSave(id, text) {
    await apiFetch(`/ohs-inspection-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    refetch()
  }

  async function handleToggle(id, field, value) {
    await apiFetch(`/ohs-inspection-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    refetch()
  }

  async function handleDelete(id) {
    await apiFetch(`/ohs-inspection-templates/${id}`, { method: 'DELETE' })
    refetch()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {previewCadence && (
        <InspectionPreviewModal
          isOpen={true}
          cadence={previewCadence}
          templates={templates}
          onClose={() => setPreviewCadence(null)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {CADENCES.map(cadence => {
          const col = PANEL_COLOURS[cadence]
          const qs  = templates[cadence]
          return (
            <div key={cadence} style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: col.header, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: col.accent, textTransform: 'capitalize' }}>{cadence}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: col.accent }}>{qs.length} questions</span>
                  <button
                    style={{ ...styles.btnSmall, background: col.accent, color: '#fff', fontSize: 11 }}
                    onClick={() => setPreviewCadence(cadence)}
                  >
                    Preview
                  </button>
                </div>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                {qs.map(q => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    onToggleActive={(id, v) => handleToggle(id, 'active', v)}
                    onTogglePhoto={(id, v) => handleToggle(id, 'requiresPhoto', v)}
                    onEditSave={handleEditSave}
                    onDelete={handleDelete}
                  />
                ))}
                {addingCadence === cadence ? (
                  <AddQuestionForm
                    cadence={cadence}
                    onAdd={handleAdd}
                    onCancel={() => setAddingCadence(null)}
                  />
                ) : (
                  <button
                    style={{ ...styles.btnSecondary, marginTop: 12, width: '100%', textAlign: 'center', fontSize: 12 }}
                    onClick={() => setAddingCadence(cadence)}
                  >
                    + Add Question
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
