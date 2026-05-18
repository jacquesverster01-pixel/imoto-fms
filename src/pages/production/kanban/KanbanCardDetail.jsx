import { checkTaskAllocation } from '../../../utils/stockAllocation.js'

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

export default function KanbanCardDetail({ task, onStatusChange, isUpdating, stockCache, globalAllocations, stockCacheData }) {
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
    <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f2f5', background: '#fafbff' }}>
      {task.notes && (
        <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 8, lineHeight: 1.5 }}>{task.notes}</div>
      )}
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
    </div>
  )
}
