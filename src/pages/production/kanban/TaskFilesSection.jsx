import { useState, useRef } from 'react'
import { BASE, UPLOADS_BASE } from '../../../hooks/useApi.js'

const labelStyle = { fontSize: 11, fontWeight: 600, color: '#9298c4', marginBottom: 3, display: 'block' }

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

export default function TaskFilesSection({ task, onTaskAction, isUpdating }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

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

  return (
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
  )
}
