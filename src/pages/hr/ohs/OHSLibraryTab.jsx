import { useState, useRef } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'

import { UPLOADS_BASE as UPLOADS_URL } from '../../../hooks/useApi'
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx'

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function mimeIcon(mime) {
  if (mime === 'application/pdf') return '📄'
  if (mime && mime.startsWith('image/')) return '🖼'
  return '📎'
}

export default function OHSLibraryTab() {
  const { data: raw, refetch } = useGet('/ohs-files?context=library')
  const files = Array.isArray(raw) ? raw : []

  const [search,    setSearch]    = useState('')
  const [label,     setLabel]     = useState('')
  const [selFile,   setSelFile]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const fileRef = useRef(null)

  const filtered = files.filter(f => {
    if (!search) return true
    const q = search.toLowerCase()
    return (f.label || '').toLowerCase().includes(q) ||
           (f.originalName || '').toLowerCase().includes(q)
  }).sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))

  async function handleUpload() {
    if (!selFile) { setError('Select a file first.'); return }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', selFile)
      fd.append('context', 'library')
      fd.append('uploadedBy', 'Library')
      fd.append('label', label)
      await apiFetch('/ohs-files/upload', { method: 'POST', body: fd })
      refetch()
      setLabel('')
      setSelFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setError('Upload failed. Check the server is running.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/ohs-files/${id}`, { method: 'DELETE' })
      refetch()
    } catch {
      setError('Delete failed.')
    } finally {
      setConfirmId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Upload panel */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b', marginBottom: 14 }}>Upload Document</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Label</label>
            <input
              style={{ fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid #e4e6ea', fontFamily: 'inherit', width: '100%', outline: 'none', boxSizing: 'border-box' }}
              placeholder="e.g. OHSA Act 85 of 1993"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>File</label>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              onChange={e => setSelFile(e.target.files[0] || null)}
              style={{ fontSize: 12 }}
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !selFile}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: uploading || !selFile ? '#b0b5cc' : '#6c63ff',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: uploading || !selFile ? 'default' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</div>}
      </div>

      {/* Confirm delete */}
      {confirmId && (
        <div style={{ background: '#fff3cd', border: '1px solid #f59e0b', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          <span style={{ flex: 1 }}>Delete this document? This cannot be undone.</span>
          <button onClick={() => handleDelete(confirmId)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Delete</button>
          <button onClick={() => setConfirmId(null)} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #e4e6ea', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
      )}

      {/* Library list */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b' }}>
            Library Documents <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>({filtered.length})</span>
          </div>
          <input
            style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid #e4e6ea', outline: 'none', fontFamily: 'inherit', width: 220 }}
            placeholder="Search label or filename…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0', fontSize: 14 }}>
            {files.length === 0 ? 'No library documents yet' : 'No results for that search'}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map(f => (
            <div key={f.id} style={{ border: '1px solid #e4e6ea', borderRadius: 10, padding: '14px 16px', background: '#fafafa' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{mimeIcon(f.mimeType)}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e1f3b', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.label || f.originalName}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.originalName}
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>
                {fmtSize(f.size)} · {(f.uploadedAt || '').slice(0, 10)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`${UPLOADS_URL}/${f.filename}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: 1, textAlign: 'center', fontSize: 12, padding: '6px 0', borderRadius: 6, background: '#ede9fe', color: '#5b21b6', textDecoration: 'none', fontWeight: 600 }}
                >
                  Download
                </a>
                <button
                  onClick={() => setConfirmId(f.id)}
                  style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
