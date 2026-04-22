import { useState, useRef } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { UPLOADS_BASE } from '../../hooks/useApi'

const sectionStyle = { padding: '16px', borderBottom: '1px solid #f0f1f5' }
const labelStyle   = { fontSize: 11, fontWeight: 700, color: '#9298c4', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, display: 'block' }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

function printComponentsList(task) {
  const rows = (task.components || []).map(c => `
    <tr>
      <td style="font-family: monospace; padding: 6px 10px; border-bottom: 1px solid #ddd;">${escapeHtml(c.itemCode || '')}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${escapeHtml(c.itemDescription || '')}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: right;">${c.quantity != null ? c.quantity : ''}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${escapeHtml(c.unit || '')}</td>
    </tr>
  `).join('')

  const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Components — ${escapeHtml(task.name || '')}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1d3b; margin: 24px; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; padding: 6px 10px; border-bottom: 2px solid #333; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
        th.num { text-align: right; }
        @media print { body { margin: 12mm; } button { display: none; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(task.name || 'Components')}</h1>
      <div class="meta">
        ${task.itemCode ? escapeHtml(task.itemCode) + ' · ' : ''}${task.components.length} component${task.components.length !== 1 ? 's' : ''} · Printed ${new Date().toLocaleString()}
      </div>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th class="num">Qty</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) { alert('Pop-up blocked. Please allow pop-ups to print the components list.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 200)
}

export default function TaskWindow({ task, parentId, pos, onClose, onChangeName, onCheckTask, onAddSubTask, onUpdateNotes, onUpdatePct, onUploadFile, onDeleteFile, onDelete }) {
  const windowRef    = useRef(null)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  useClickOutside(windowRef, onClose)

  const isSubTask = !!parentId
  const maxH = Math.round(window.innerHeight * 0.72)
  const left = Math.max(8, Math.min(pos.x + 340, window.innerWidth - 8) - 340)
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

            {task.components?.length > 0 && (
              <div style={sectionStyle}>
                <span style={labelStyle}>Components</span>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', color: '#9298c4', fontWeight: 600, paddingBottom: 6, fontSize: 11 }}>Code</th>
                      <th style={{ textAlign: 'left', color: '#9298c4', fontWeight: 600, paddingBottom: 6, fontSize: 11, paddingLeft: 6 }}>Description</th>
                      <th style={{ textAlign: 'right', color: '#9298c4', fontWeight: 600, paddingBottom: 6, fontSize: 11 }}>Qty</th>
                      <th style={{ textAlign: 'right', color: '#9298c4', fontWeight: 600, paddingBottom: 6, fontSize: 11, paddingLeft: 6 }}>Unit cost</th>
                      <th style={{ textAlign: 'right', color: '#9298c4', fontWeight: 600, paddingBottom: 6, fontSize: 11, paddingLeft: 6 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {task.components.map((c, i) => {
                      const qty = c.quantity ?? null
                      const unitCost = c.unitCost ?? null
                      const total = c.totalCost ?? (qty != null && unitCost != null ? qty * unitCost : null)
                      return (
                        <tr key={i} style={{ borderTop: '1px solid #f0f1f5', height: 28 }}>
                          <td style={{ padding: '4px 4px 4px 0', fontFamily: 'monospace', color: '#1a1d3b', fontSize: 11, whiteSpace: 'nowrap' }}>{c.itemCode || '—'}</td>
                          <td style={{ padding: '4px 6px', color: '#3a3e5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{c.itemDescription || '—'}</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', color: '#1a1d3b', whiteSpace: 'nowrap' }}>{qty != null ? `${qty}${c.unit ? ' ' + c.unit : ''}` : '—'}</td>
                          <td style={{ padding: '4px 0 4px 6px', textAlign: 'right', color: '#1a1d3b', whiteSpace: 'nowrap' }}>{unitCost != null ? `R${Number(unitCost).toFixed(2)}` : '—'}</td>
                          <td style={{ padding: '4px 0 4px 6px', textAlign: 'right', color: '#1a1d3b', whiteSpace: 'nowrap' }}>{total != null ? `R${Number(total).toFixed(2)}` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ padding: '16px' }}>
              <span style={labelStyle}>Children</span>
              {(task.children || []).length === 0 && (
                <div style={{ fontSize: 13, color: '#c0c5d8', marginBottom: 8 }}>No children yet</div>
              )}
              {(task.children || []).map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <input type="checkbox" checked={!!st.done} onChange={() => onCheckTask(st.id, task.id)}
                    style={{ flexShrink: 0, cursor: 'pointer' }} />
                  <input value={st.name} onChange={e => onChangeName(st.id, task.id, e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: st.done ? '#b0b5cc' : '#1a1d3b', textDecoration: st.done ? 'line-through' : 'none', minWidth: 0, lineHeight: 1.5 }} />
                </div>
              ))}
              <button onClick={() => onAddSubTask(task.id, null)}
                style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#4f67e4', fontSize: 13, padding: 0, fontWeight: 600 }}>
                + Add child
              </button>
            </div>
          </>
        )}

        {activeTab === 'files' && (
          <div>
            {task.components?.length > 0 && (
              <div style={{ padding: '16px', borderBottom: '1px solid #f0f1f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <span style={labelStyle}>Components list</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9298c4' }}>
                    {task.components.length} item{task.components.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => printComponentsList(task)}
                  style={{ padding: '10px 0', background: '#f0f4ff', color: '#4f67e4', border: '1px solid #c7d0f8', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%' }}>
                  🖨 Print components list
                </button>
              </div>
            )}
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
          </div>
        )}
      </div>
    </div>
  )
}
