import { useState } from 'react'
import { useGet, apiFetch } from '../hooks/useApi'
import { fmtLocaleDate } from '../utils/time.js'
import AddEditStockModal from './stock/AddEditStockModal'
import AdjustQtyModal from './stock/AdjustQtyModal'
import ImportStockModal from './stock/ImportStockModal'

function getReorder(item) {
  return item.reorderLevel ?? item.min ?? 0
}

function computeStatus(item) {
  const reorder = getReorder(item)
  if ((item.qty || 0) <= 0) return 'out'
  if (reorder > 0 && item.qty <= reorder) return 'low'
  return 'ok'
}

function isLow(item) { return computeStatus(item) === 'low' }
function isOut(item) { return (item.qty || 0) <= 0 }

function lastImportDate(items) {
  const dates = items.map(i => i.importedAt).filter(Boolean).sort()
  return dates.length ? dates[dates.length - 1] : null
}

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

export default function Stock() {
  const { data: rawStock, loading, refetch } = useGet('/stock')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [adjustItem, setAdjustItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const items = rawStock || []
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort()

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      i.name?.toLowerCase().includes(q) ||
      i.id?.toLowerCase().includes(q) ||
      i.code?.toLowerCase().includes(q)
    const matchCat = !catFilter || i.category === catFilter
    const matchLow = !lowOnly || isLow(i) || isOut(i)
    return matchSearch && matchCat && matchLow
  })

  const lowCount = items.filter(isLow).length
  const outCount = items.filter(isOut).length
  const lastImport = lastImportDate(items)

  async function handleDelete(id) {
    await apiFetch(`/stock/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    refetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: '#1a1d3b' }}>Stock Tracker</h2>
        <div className="flex gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded-lg border font-medium"
            style={{ background: '#fff', color: '#6c63ff', borderColor: '#6c63ff' }}
            onClick={() => setShowImport(true)}
          >
            ↑ Import CSV
          </button>
          <button
            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
            style={{ background: '#6c63ff' }}
            onClick={() => setShowAddModal(true)}
          >
            + Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Items',   value: items.length },
          { label: 'Low Stock',     value: lowCount, color: lowCount > 0 ? '#b45309' : '#1a1d3b' },
          { label: 'Out of Stock',  value: outCount, color: outCount > 0 ? '#dc2626' : '#1a1d3b' },
          { label: 'Categories',    value: categories.length },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl p-3 border" style={{ borderColor: '#e4e6ea' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#9298c4' }}>{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color || '#1a1d3b', lineHeight: 1 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          className="text-xs px-3 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: '#e4e6ea', width: 200 }}
          placeholder="Search name, ID or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="text-xs px-3 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: '#e4e6ea', color: '#4a4f7a' }}
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
          style={{ color: lowOnly ? '#b45309' : '#9298c4' }}>
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          Low / out of stock only{lowCount + outCount > 0 ? ` (${lowCount + outCount})` : ''}
        </label>
      </div>

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
                        onClick={() => setAdjustItem(item)}
                        className="text-xs px-2 py-1 rounded-md font-medium"
                        style={{ background: '#f0f2f5', color: '#4a4f7a', border: 'none', cursor: 'pointer' }}
                      >
                        ± Qty
                      </button>
                      <button
                        onClick={() => setEditItem(item)}
                        className="text-xs px-2 py-1 rounded-md font-medium"
                        style={{ background: '#f0f2f5', color: '#4a4f7a', border: 'none', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      {deleteConfirm === item.id
                        ? <span className="flex items-center gap-1">
                            <span style={{ color: '#dc2626', fontSize: 11 }}>Delete?</span>
                            <button onClick={() => handleDelete(item.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} style={{ background: '#f0f2f5', color: '#555', border: 'none', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>No</button>
                          </span>
                        : <button
                            onClick={() => setDeleteConfirm(item.id)}
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
              onClick={() => setShowImport(true)}
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

      {items.length > 0 && (
        <div className="flex items-center justify-between mt-2 text-xs" style={{ color: '#b0b5cc' }}>
          <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          {lastImport && (
            <span>Last import: {fmtLocaleDate(lastImport)}</span>
          )}
        </div>
      )}

      {showImport && (
        <ImportStockModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refetch() }}
        />
      )}
      {showAddModal && (
        <AddEditStockModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSave={() => { setShowAddModal(false); refetch() }}
        />
      )}
      {editItem && (
        <AddEditStockModal
          item={editItem}
          categories={categories}
          onClose={() => setEditItem(null)}
          onSave={() => { setEditItem(null); refetch() }}
        />
      )}
      {adjustItem && (
        <AdjustQtyModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSave={() => { setAdjustItem(null); refetch() }}
        />
      )}
    </div>
  )
}
