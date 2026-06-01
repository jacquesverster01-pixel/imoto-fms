import { useState, useEffect, useRef } from 'react'
import { checkTaskAllocation } from '../../../utils/stockAllocation.js'
import { BASE, UPLOADS_BASE } from '../../../hooks/useApi.js'

function formatCacheAge(updatedAt) {
  if (!updatedAt) return '—'
  const diffMin = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

function CompStatusIcon({ status }) {
  if (status === 'ok')    return <span style={{ color: '#22c55e' }}>✓</span>
  if (status === 'short') return <span style={{ color: '#f59e0b' }}>⚠</span>
  if (status === 'out')   return <span style={{ color: '#ef4444' }}>✕</span>
  return <span style={{ color: '#9298c4' }}>—</span>
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

function printComponentsList(task) {
  const rows = (task.components || []).map(c => `
    <tr>
      <td style="font-family:monospace;padding:6px 10px;border-bottom:1px solid #ddd">${escapeHtml(c.itemCode || '')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #ddd">${escapeHtml(c.itemDescription || '')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right">${c.quantity != null ? c.quantity : ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #ddd">${escapeHtml(c.unit || '')}</td>
    </tr>
  `).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <title>Components — ${escapeHtml(task.name || '')}</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1d3b;margin:24px}
      h1{font-size:16px;margin:0 0 4px}.meta{font-size:12px;color:#666;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;padding:6px 10px;border-bottom:2px solid #333;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
      th.num{text-align:right}
      @media print{body{margin:12mm}button{display:none}}
    </style></head><body>
    <h1>${escapeHtml(task.name || 'Components')}</h1>
    <div class="meta">${task.itemCode ? escapeHtml(task.itemCode) + ' · ' : ''}${task.components.length} component${task.components.length !== 1 ? 's' : ''} · Printed ${new Date().toLocaleString()}</div>
    <table><thead><tr><th>Code</th><th>Description</th><th class="num">Qty</th><th>Unit</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) { alert('Pop-up blocked. Please allow pop-ups to print the components list.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 200)
}

const labelStyle = { fontSize: 11, fontWeight: 600, color: '#9298c4', marginBottom: 3, display: 'block' }
const inputStyle = {
  width: '100%', fontSize: 12, color: '#1a1d3b', background: '#fff',
  border: '1px solid #e4e6ea', borderRadius: 4, padding: '4px 6px',
  fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
}

export default function KanbanCardDetail({ task, onTaskPatch, onTaskAction, isUpdating, stockCache, globalAllocations, stockCacheData, departments }) {
  const [localName, setLocalName] = useState(task.name || '')
  const [localNotes, setLocalNotes] = useState(task.notes || '')
  const [localPct, setLocalPct] = useState(task.pct ?? 0)
  const [activeTab, setActiveTab] = useState('details')
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setLocalName(task.name || '')
    setLocalNotes(task.notes || '')
    setLocalPct(task.pct ?? 0)
  }, [task.id])

  function saveName() {
    const trimmed = localName.trim()
    if (trimmed && trimmed !== task.name) onTaskPatch(task, { name: trimmed })
  }

  function saveNotes() {
    if (localNotes !== (task.notes || '')) onTaskPatch(task, { notes: localNotes })
  }

  function savePct(val) {
    const n = Number(val)
    if (n !== (task.pct ?? 0)) onTaskPatch(task, { pct: n })
  }

  async function handleFileUpload(file) {
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const res = await fetch(`${BASE}/jobs/${task.jobId}/tasks/${task.id}/files`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const rec = await res.json()
      await onTaskAction('addFileRecord', task, rec)
    } catch (err) {
      console.error('File upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const comps = task.components || []
  const allocResults = comps.length > 0
    ? checkTaskAllocation(task, stockCache || {}, globalAllocations || new Map()).map((r, i) => ({
        ...r,
        description: comps[i]?.itemDescription || '',
        unit: comps[i]?.unit || '',
      }))
    : []
  const okCount = allocResults.filter(r => r.status === 'ok').length

  return (
    <div style={{ borderTop: '1px solid #f0f2f5', background: '#fafbff' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #e4e6ea', background: '#f5f7fb' }}>
        {['details', 'files'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '5px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? '#4f67e4' : '#9298c4', borderBottom: activeTab === tab ? '2px solid #4f67e4' : '2px solid transparent' }}>
            {tab === 'details' ? 'Details' : 'Files'}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div style={{ padding: '10px 12px' }}>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Task name</label>
            <input
              style={inputStyle}
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              disabled={isUpdating}
            />
          </div>

          {Array.isArray(departments) && departments.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <label style={labelStyle}>Departments</label>
                {Array.isArray(task.departments) && task.departments.length > 0 && (
                  <button
                    onClick={() => onTaskPatch(task, { departments: [] })}
                    disabled={isUpdating}
                    style={{ fontSize: 10, color: '#9298c4', background: 'none', border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    Clear / use auto
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {departments.map(dept => {
                  const manualDepts = Array.isArray(task.departments) ? task.departments : []
                  const isOn = manualDepts.includes(dept.name)
                  const next = isOn ? manualDepts.filter(d => d !== dept.name) : [...manualDepts, dept.name]
                  return (
                    <button
                      key={dept.name}
                      onClick={() => onTaskPatch(task, { departments: next })}
                      disabled={isUpdating}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        border: `1px solid ${isOn ? dept.color : '#e4e6ea'}`,
                        background: isOn ? dept.color : 'transparent',
                        color: isOn ? '#fff' : '#6b7280',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        fontWeight: isOn ? 600 : 400,
                        opacity: isUpdating ? 0.5 : 1,
                      }}
                    >
                      {dept.name}
                    </button>
                  )
                })}
              </div>
              {!(Array.isArray(task.departments) && task.departments.length > 0) && (
                <div style={{ fontSize: 10, color: '#b0b5cc', marginTop: 3 }}>
                  Auto — derived from component codes
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={saveNotes}
              disabled={isUpdating}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Progress</label>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1d3b', minWidth: 32, textAlign: 'right' }}>{localPct}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5} value={localPct}
              onChange={e => setLocalPct(Number(e.target.value))}
              onMouseUp={e => savePct(e.target.value)}
              onTouchEnd={e => savePct(e.target.value)}
              disabled={isUpdating}
              style={{ width: '100%', cursor: isUpdating ? 'not-allowed' : 'pointer' }}
            />
          </div>

          {comps.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Components</span>
                <span style={{ fontSize: 10, color: '#b0b5cc' }}>cache {formatCacheAge(stockCacheData?.updatedAt)}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '2px 4px 2px 0', color: '#9298c4', fontWeight: 500 }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '2px 4px', color: '#9298c4', fontWeight: 500 }}>Desc</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px', color: '#9298c4', fontWeight: 500 }}>Req</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px', color: '#9298c4', fontWeight: 500 }}>Avail</th>
                    <th style={{ textAlign: 'center', padding: '2px 0 2px 4px', color: '#9298c4', fontWeight: 500 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {allocResults.map(r => (
                    <tr key={r.itemCode} style={{ borderBottom: '1px solid #f0f2f5' }}>
                      <td style={{ padding: '3px 4px 3px 0', color: '#374151', fontFamily: 'monospace', fontSize: 10, whiteSpace: 'nowrap' }}>{r.itemCode}</td>
                      <td style={{ padding: '3px 4px', color: '#6b7280', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right', color: '#374151' }}>{r.required}</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right', color: '#374151' }}>{r.available === null ? '—' : r.available}</td>
                      <td style={{ padding: '3px 0 3px 4px', textAlign: 'center' }}><CompStatusIcon status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 10, color: '#9298c4', marginTop: 5 }}>
                {okCount} of {comps.length} component{comps.length !== 1 ? 's' : ''} fully stocked
              </div>
            </div>
          )}

          <div style={{ marginTop: 6 }}>
            <label style={labelStyle}>Sub-tasks</label>
            {(task.children || []).length === 0 && (
              <div style={{ fontSize: 12, color: '#c0c5d8', marginBottom: 4 }}>No sub-tasks yet</div>
            )}
            {(task.children || []).map(child => (
              <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                <input
                  type="checkbox"
                  checked={!!child.done}
                  onChange={() => onTaskPatch({ ...child, jobId: task.jobId }, { done: !child.done, pct: !child.done ? 100 : 0 })}
                  disabled={isUpdating}
                  style={{ flexShrink: 0, cursor: isUpdating ? 'not-allowed' : 'pointer' }}
                />
                <input
                  defaultValue={child.name}
                  onBlur={e => {
                    const trimmed = e.target.value.trim()
                    if (trimmed && trimmed !== child.name) onTaskPatch({ ...child, jobId: task.jobId }, { name: trimmed })
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                  disabled={isUpdating}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, background: 'transparent', color: child.done ? '#b0b5cc' : '#1a1d3b', textDecoration: child.done ? 'line-through' : 'none', minWidth: 0 }}
                />
              </div>
            ))}
            <button
              onClick={() => onTaskAction('addChild', task)}
              disabled={isUpdating}
              style={{ marginTop: 5, background: 'none', border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', color: '#4f67e4', fontSize: 12, padding: 0, fontWeight: 600 }}
            >
              + Add sub-task
            </button>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div style={{ padding: '10px 12px' }}>
          {comps.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <button
                onClick={() => printComponentsList(task)}
                style={{ padding: '7px 0', background: '#f0f4ff', color: '#4f67e4', border: '1px solid #c7d0f8', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600, width: '100%' }}
              >
                Print components list
              </button>
            </div>
          )}
          <label style={labelStyle}>Files</label>
          {(task.files || []).length === 0 && (
            <div style={{ fontSize: 12, color: '#c0c5d8', marginBottom: 8 }}>No files attached</div>
          )}
          {(task.files || []).map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1d3b' }}>{f.name}</span>
              <a href={`${UPLOADS_BASE}/${(f.url || '').replace(/^\/uploads\//, '')}`} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: '#4f67e4', textDecoration: 'none', flexShrink: 0 }}>Open</a>
              <button
                onClick={() => onTaskAction('deleteFile', task, f.id)}
                disabled={isUpdating}
                style={{ border: 'none', background: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', color: '#dc2626', fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={async e => {
              if (!e.target.files[0]) return
              await handleFileUpload(e.target.files[0])
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isUpdating}
            style={{ marginTop: 8, padding: '7px 0', background: '#f0f4ff', color: '#4f67e4', border: '1px solid #c7d0f8', borderRadius: 5, cursor: (uploading || isUpdating) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, width: '100%', opacity: (uploading || isUpdating) ? 0.7 : 1 }}
          >
            {uploading ? 'Uploading…' : '+ Upload file'}
          </button>
        </div>
      )}

      <div style={{ padding: '6px 12px', borderTop: '1px solid #f0f2f5' }}>
        {confirmDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: '#dc2626', flex: 1 }}>Delete this task?</span>
            <button
              onClick={() => { onTaskAction('deleteTask', task); setConfirmDelete(false) }}
              style={{ fontSize: 11, padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >Delete</button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ fontSize: 11, padding: '2px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isUpdating}
            style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', padding: 0, opacity: isUpdating ? 0.5 : 1 }}
          >
            Delete task
          </button>
        )}
      </div>
    </div>
  )
}
