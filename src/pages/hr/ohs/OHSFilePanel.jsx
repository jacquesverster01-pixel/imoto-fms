import { useState, useRef } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'

import { UPLOADS_BASE as UPLOADS_URL } from '../../../hooks/useApi'
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx'

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function OHSFilePanel({ context, contextId, uploadedBy }) {
  const qstr    = `context=${encodeURIComponent(context)}&contextId=${encodeURIComponent(contextId || '')}`
  const { data: raw, refetch } = useGet(`/ohs-files?${qstr}`)
  const files   = Array.isArray(raw) ? raw : []

  const [label,     setLabel]     = useState('')
  const [selFile,   setSelFile]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const fileRef = useRef(null)

  async function handleUpload() {
    if (!selFile) { setError('Select a file first.'); return }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', selFile)
      fd.append('context', context)
      fd.append('contextId', contextId || '')
      fd.append('uploadedBy', uploadedBy || '')
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
    <details style={{ marginTop: 10 }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6c63ff', userSelect: 'none', padding: '4px 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>▸ Documents</span>
        {files.length > 0 && (
          <span style={{ fontSize: 11, background: '#ede9fe', color: '#5b21b6', borderRadius: 10, padding: '1px 7px' }}>{files.length}</span>
        )}
      </summary>

      <div style={{ paddingTop: 10, paddingLeft: 4 }}>
        {/* Confirm delete */}
        {confirmId && (
          <div style={{ fontSize: 12, background: '#fff3cd', border: '1px solid #f59e0b', borderRadius: 6, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1 }}>Delete this file?</span>
            <button onClick={() => handleDelete(confirmId)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
            <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #e4e6ea', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        )}

        {/* File list */}
        {files.length === 0 && (
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>No files attached</div>
        )}
        {files.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid #f0f2f5', fontSize: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#1e1f3b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.label || f.originalName}
              </div>
              <div style={{ color: '#888', fontSize: 11 }}>
                {f.originalName} · {fmtSize(f.size)} · {(f.uploadedAt || '').slice(0, 10)}
              </div>
            </div>
            <a
              href={`${UPLOADS_URL}/${f.filename}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11, color: '#6c63ff', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Download
            </a>
            <button
              onClick={() => setConfirmId(f.id)}
              style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
            >
              Delete
            </button>
          </div>
        ))}

        {/* Upload form */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
          <input
            style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid #e4e6ea', fontFamily: 'inherit', flex: '1 1 140px', minWidth: 120, outline: 'none' }}
            placeholder="Label (e.g. Inspection certificate)"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={e => setSelFile(e.target.files[0] || null)}
            style={{ fontSize: 11, flex: '1 1 160px' }}
          />
          <button
            onClick={handleUpload}
            disabled={uploading || !selFile}
            style={{
              fontSize: 12, padding: '5px 14px', borderRadius: 6, border: 'none',
              background: uploading || !selFile ? '#b0b5cc' : '#6c63ff',
              color: '#fff', cursor: uploading || !selFile ? 'default' : 'pointer',
              fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        {error && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{error}</div>}
      </div>
    </details>
  )
}
