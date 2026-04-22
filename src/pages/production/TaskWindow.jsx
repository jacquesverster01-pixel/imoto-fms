import { useState, useRef } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { UPLOADS_BASE } from '../../hooks/useApi'

const sectionStyle = { padding: '16px', borderBottom: '1px solid #f0f1f5' }
const labelStyle   = { fontSize: 11, fontWeight: 700, color: '#9298c4', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, display: 'block' }

export default function TaskWindow({ task, parentId, pos, onClose, onChangeName, onCheckTask, onAddSubTask, onUpdateNotes, onUpdatePct, onUploadFile, onDeleteFile, onDelete }) {
  const windowRef    = useRef(null)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  useClickOutside(windowRef, onClose)

  const isSubTask = !!parentId
  const maxH = Math.round(window.innerHeight * 0.72)
  const left = Math.min(pos.x + 340, window.innerWidth - 8) - 340
  const top  = Math.max(8, Math.min(pos.y, window.innerHeight - maxH - 8))

  return (
    <div ref={windowRef} onClick={e => e.stopPropagation()}
      style={{ position: 'fixed', left, top, zIndex: 300, width: 340, minHeight: 400, maxHeight: maxH, background: '#fff', borderRadius: 10, boxShadow: '0 10px 36px rgba(0,0,0,0.22)', border: '1px solid #e0e3ef', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', background: '#f8f9fb', borderBottom: '1px solid #eef0f6', flexShrink: 0 }}>
        <button onClick={onDelete} title="Delete task"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9298c4', padding: '3px 4px', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
            <path d="M1 3.5h11M4.5 3.5V2h4v1.5M3 3.5l.6 8.5h5.8L10 3.5M5 6v4.5M8 6v4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <input value={task.name} onChange={e => onChangeName(task.id, parentId, e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: '#1a1d3b', background: 'transparent', minWidth: 0 }} />
        <button onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9298c4', fontSize: 22, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e4e6ea', flexShrink: 0 }}>
        {['details', 'files'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? '#4f67e4' : '#9298c4', borderBottom: activeTab === tab ? '2px solid #4f67e4' : '2px solid transparent' }}>
            {tab === 'details' ? 'Details' : 'Files'}
          </button>
        ))}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {activeTab === 'details' && (
          <>
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ ...labelStyle, marginBottom: 0 }}>Progress</span>
                <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#4f67e4' }}>{task.pct || 0}%</span>
              </div>
              <input type="range" min="0" max="100" step="5" value={task.pct || 0}
                onChange={e => onUpdatePct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#4f67e4', marginTop: 8 }} />
            </div>

            <div style={sectionStyle}>
              <span style={labelStyle}>Notes</span>
              <textarea value={task.notes || ''} onChange={e => onUpdateNotes(e.target.value)}
                style={{ width: '100%', height: 120, resize: 'vertical', border: '1px solid #dde0ea', borderRadius: 6, padding: '9px 11px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1a1d3b', lineHeight: 1.6 }}
                placeholder="Add notes…" />
            </div>

            {!isSubTask && (
              <div style={{ padding: '16px' }}>
                <span style={labelStyle}>Sub-tasks</span>
                {(task.subTasks || []).length === 0 && (
                  <div style={{ fontSize: 13, color: '#c0c5d8', marginBottom: 8 }}>No sub-tasks yet</div>
                )}
                {(task.subTasks || []).map(st => (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                    <input type="checkbox" checked={!!st.done} onChange={() => onCheckTask(st.id, task.id)}
                      style={{ flexShrink: 0, cursor: 'pointer' }} />
                    <input value={st.name} onChange={e => onChangeName(st.id, task.id, e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: st.done ? '#b0b5cc' : '#1a1d3b', textDecoration: st.done ? 'line-through' : 'none', minWidth: 0, lineHeight: 1.5 }} />
                  </div>
                ))}
                <button onClick={() => onAddSubTask(task.id, null)}
                  style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#4f67e4', fontSize: 13, padding: 0, fontWeight: 600 }}>
                  + Add sub-task
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'files' && (
          <div style={{ padding: '16px' }}>
            {(task.files || []).length === 0 && (
              <div style={{ fontSize: 13, color: '#c0c5d8', marginBottom: 12 }}>No files attached</div>
            )}
            {(task.files || []).map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f6fa' }}>
                <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1d3b' }}>{f.name}</span>
                <a href={`${UPLOADS_BASE}/${f.url?.replace(/^\/uploads\//, '')}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#4f67e4', textDecoration: 'none', flexShrink: 0 }}>Open</a>
                <button onClick={() => onDeleteFile(f.id)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            ))}
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={async e => {
              if (!e.target.files[0]) return
              setUploading(true)
              await onUploadFile(e.target.files[0])
              setUploading(false)
              e.target.value = ''
            }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ marginTop: 12, padding: '10px 0', background: '#f0f4ff', color: '#4f67e4', border: '1px solid #c7d0f8', borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, width: '100%', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? 'Uploading…' : '+ Upload file'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
