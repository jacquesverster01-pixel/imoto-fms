import { getReorder, computeStatus } from './stockHelpers'

function Th({ children }) {
  return (
    <th className="text-left px-3 py-2.5 text-xs font-medium uppercase tracking-wider border-b"
      style={{ color: '#9298c4', borderColor: '#f0f2f5', background: '#fafbff', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}

function Td({ children }) {
  return <td className="px-3 py-2.5 text-xs border-b" style={{ color: '#4a4f7a', borderColor: '#f7f8fa' }}>{children}</td>
}

function StatusPill({ status }) {
  const map = {
    ok:  { bg: '#e8f8f0', color: '#16a34a' },
    low: { bg: '#fffbeb', color: '#b45309' },
    out: { bg: '#fef2f2', color: '#dc2626' },
  }
  const s = map[status] || map.ok
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {status}
    </span>
  )
}

function QtyBar({ qty, reorder }) {
  if (!reorder) {
    return <span className="font-semibold" style={{ color: qty <= 0 ? '#dc2626' : '#1a1d3b' }}>{qty}</span>
  }
  const pct = Math.min(100, Math.round((qty / (reorder * 2)) * 100))
  const barColor = qty <= 0 ? '#dc2626' : qty <= reorder ? '#f59e0b' : '#16a34a'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="font-semibold" style={{ color: qty <= 0 ? '#dc2626' : qty <= reorder ? '#b45309' : '#1a1d3b', minWidth: 28 }}>{qty}</span>
      <div style={{ flex: 1, background: '#f0f2f5', borderRadius: 4, height: 6, minWidth: 48 }}>
        <div style={{ width: `${pct}%`, background: barColor, borderRadius: 4, height: 6 }} />
      </div>
    </div>
  )
}

export default function StockTable({ loading, items, filtered, deleteConfirm, onAdjust, onEdit, onDelete, onAskDelete, onImport }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e4e6ea' }}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>Code</Th>
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Unit</Th>
            <Th>Qty</Th>
            <Th>Reorder</Th>
            <Th>Location</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 9 }).map((_, j) => (
                <td key={j} className="px-3 py-2.5 border-b" style={{ borderColor: '#f7f8fa' }}>
                  <div style={{ height: 12, background: '#f0f2f5', borderRadius: 4, width: '70%' }} />
                </td>
              ))}
            </tr>
          ))}
          {!loading && filtered.map(item => {
            const reorder = getReorder(item)
            const status = item.status || computeStatus(item)
            return (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <Td><span className="font-mono" style={{ color: '#9298c4' }}>{item.code || item.id}</span></Td>
                <Td><span className="font-medium" style={{ color: '#1a1d3b' }}>{item.name}</span></Td>
                <Td>{item.category || '—'}</Td>
                <Td>{item.unit || '—'}</Td>
                <Td><QtyBar qty={item.qty || 0} reorder={reorder} /></Td>
                <Td>{reorder || '—'}</Td>
                <Td>{item.location || '—'}</Td>
                <Td><StatusPill status={status} /></Td>
                <Td>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onAdjust(item)}
                      className="text-xs px-2 py-1 rounded-md font-medium"
                      style={{ background: '#f0f2f5', color: '#4a4f7a', border: 'none', cursor: 'pointer' }}
                    >
                      ± Qty
                    </button>
                    <button
                      onClick={() => onEdit(item)}
                      className="text-xs px-2 py-1 rounded-md font-medium"
                      style={{ background: '#f0f2f5', color: '#4a4f7a', border: 'none', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    {deleteConfirm === item.id
                      ? <span className="flex items-center gap-1">
                          <span style={{ color: '#dc2626', fontSize: 11 }}>Delete?</span>
                          <button onClick={() => onDelete(item.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>Yes</button>
                          <button onClick={() => onAskDelete(null)} style={{ background: '#f0f2f5', color: '#555', border: 'none', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>No</button>
                        </span>
                      : <button
                          onClick={() => onAskDelete(item.id)}
                          className="text-xs px-2 py-1 rounded-md font-medium"
                          style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                    }
                  </div>
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {!loading && items.length === 0 && (
        <div className="text-center py-10 text-xs" style={{ color: '#b0b5cc' }}>
          No stock items yet.{' '}
          <button
            onClick={onImport}
            style={{ color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}
          >
            Import a CSV
          </button>
          {' '}to get started.
        </div>
      )}
      {!loading && items.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8 text-xs" style={{ color: '#b0b5cc' }}>No items match the current filters.</div>
      )}
    </div>
  )
}
