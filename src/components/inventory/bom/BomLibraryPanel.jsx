import { useRef } from 'react'
import { BASE } from '../../../hooks/useApi'

export default function BomLibraryPanel({ boms, selectedBomId, onSelect, onImport, importError }) {
  const fileInputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (file) onImport(file)
    e.target.value = ''
  }

  return (
    <div style={{
      width: 220, minWidth: 220, background: '#fff', border: '1px solid #e4e6ea',
      borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #f0f2f5' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%', background: '#6c63ff', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Import CSV
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        {importError && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', lineHeight: 1.4 }}>{importError}</div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {boms.length === 0 ? (
          <div style={{ padding: '20px 12px', fontSize: 12, color: '#b0b5cc', textAlign: 'center' }}>
            No BOMs imported yet
          </div>
        ) : boms.map(b => {
          const active = b.id === selectedBomId
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px',
                borderBottom: '1px solid #f0f2f5', border: 'none',
                borderLeft: active ? '3px solid #6c63ff' : '3px solid transparent',
                background: active ? '#f5f3ff' : 'transparent',
                cursor: 'pointer', display: 'block',
                paddingLeft: active ? 9 : 12,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#fafafa' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#6c63ff', fontWeight: 700 }}>{b.productCode}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2, lineHeight: 1.3 }}>{b.productDescription}</div>
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{b.bomReference} · {b.rowCount} rows</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
