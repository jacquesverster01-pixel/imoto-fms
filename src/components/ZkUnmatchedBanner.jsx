export default function ZkUnmatchedBanner({ punches, onDismiss }) {
  if (!punches || punches.length === 0) return null
  const uniqueZkIds = [...new Set(punches.map(p => p.zkId))]
  return (
    <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>⚠</span>
      <div style={{ flex: 1, fontSize: 13, color: '#92400e' }}>
        <strong>{punches.length} unmatched ZK punch{punches.length !== 1 ? 'es' : ''} in the last 7 days</strong>
        {' — employee IDs not found in the system: '}
        <strong>{uniqueZkIds.join(', ')}</strong>
        <div style={{ marginTop: 4, fontWeight: 400 }}>
          These employees may be enrolled on the device but not yet added to the FMS.
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#b45309', lineHeight: 1, padding: 0, flexShrink: 0 }}
        aria-label="Dismiss"
      >✕</button>
    </div>
  )
}
