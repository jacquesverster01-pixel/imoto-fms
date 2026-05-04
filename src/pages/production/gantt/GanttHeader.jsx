const STATUS_OPTIONS = [
  { value: 'quote', label: 'Quote' }, { value: 'in_progress', label: 'In progress' },
  { value: 'qc', label: 'QC' }, { value: 'dispatch', label: 'Dispatch' }, { value: 'done', label: 'Done' },
]

export default function GanttHeader({ title, setTitle, status, setStatus, zoom, setZoom, zoomScale, setZoomScale, showCriticalPath, setShowCriticalPath, showBaseline, setShowBaseline, progress, onClose, onExport, onSetBaseline, embedded }) {
  const tog = on => ({ padding: '4px 10px', borderRadius: 6, border: '1px solid #dde0ea', fontSize: 12, cursor: 'pointer', background: on ? '#4f67e4' : '#fff', color: on ? '#fff' : '#1a1d3b' })
  const zBtn = { padding: '4px 8px', border: 'none', fontSize: 13, cursor: 'pointer', background: '#fff', color: '#1a1d3b', lineHeight: 1 }
  return (
    <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderBottom: '1px solid #e4e6ea', flexShrink: 0, flexWrap: 'wrap' }}>
      <input value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1, fontWeight: 700, fontSize: 16, border: 'none', outline: 'none', color: '#1a1d3b', background: 'transparent', minWidth: 100 }} />
      <select value={status} onChange={e => setStatus(e.target.value)} style={{ fontSize: 12, border: '1px solid #dde0ea', borderRadius: 6, padding: '4px 8px', color: '#1a1d3b', background: '#fff' }}>
        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ fontSize: 12, color: '#9298c4', whiteSpace: 'nowrap' }}>{progress}</span>
      <div style={{ display: 'flex', border: '1px solid #dde0ea', borderRadius: 6, overflow: 'hidden' }}>
        {['day','week','month'].map(z => <button key={z} onClick={() => setZoom(z)} style={{ padding: '4px 9px', border: 'none', borderRight: z !== 'month' ? '1px solid #dde0ea' : 'none', fontSize: 12, cursor: 'pointer', background: zoom === z ? '#4f67e4' : '#fff', color: zoom === z ? '#fff' : '#1a1d3b' }}>{z[0].toUpperCase()+z.slice(1)}</button>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dde0ea', borderRadius: 6, overflow: 'hidden' }}>
        <button onClick={() => setZoomScale(s => Math.max(0.4, Math.round((s - 0.1) * 10) / 10))} style={{ ...zBtn, borderRight: '1px solid #dde0ea' }}>−</button>
        <button onClick={() => setZoomScale(1.0)} style={{ ...zBtn, borderRight: '1px solid #dde0ea', fontSize: 11, minWidth: 44, textAlign: 'center' }}>{Math.round(zoomScale * 100)}%</button>
        <button onClick={() => setZoomScale(s => Math.min(3.0, Math.round((s + 0.1) * 10) / 10))} style={zBtn}>+</button>
      </div>
      <button onClick={() => setShowCriticalPath(v => !v)} style={tog(showCriticalPath)}>Critical path</button>
      <button onClick={onSetBaseline} style={tog(false)}>Set baseline</button>
      <button onClick={() => setShowBaseline(v => !v)} style={tog(showBaseline)}>Show baseline</button>
      <button onClick={onExport} style={tog(false)}>Export PDF</button>
      {embedded
        ? <button onClick={onClose} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #4f67e4', fontSize: 12, cursor: 'pointer', background: '#4f67e4', color: '#fff', fontWeight: 600 }}>Save</button>
        : <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#9298c4', lineHeight: 1, padding: 0 }}>×</button>
      }
    </div>
  )
}
