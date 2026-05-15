import { useState } from 'react'
import { useGet, apiFetch } from '../hooks/useApi'
import AddEditStockModal from './stock/AddEditStockModal'
import AdjustQtyModal from './stock/AdjustQtyModal'

function isLow(item) {
  return item.qty <= item.min
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

export default function Stock() {
  const { data: stockData, refetch } = useGet('/stock')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [adjustItem, setAdjustItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showLowOnly, setShowLowOnly] = useState(false)

  const items = stockData || []
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort()

  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.id?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || i.category === categoryFilter
    const matchLow = !showLowOnly || isLow(i)
    return matchSearch && matchCat && matchLow
  })

  const lowStockCount = items.filter(isLow).length

  async function handleDelete(id) {
    await apiFetch(`/stock/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    refetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: '#1a1d3b' }}>Stock Tracker</h2>
        <button
          className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
          style={{ background: '#6c63ff' }}
          onClick={() => setShowAddModal(true)}
        >
          + Add Item
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Items', value: items.length },
          { label: 'Low Stock', value: lowStockCount, color: lowStockCount > 0 ? '#f59e0b' : '#1a1d3b' },
          { label: 'Categories', value: categories.length },
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
          placeholder="Search name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="text-xs px-3 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: '#e4e6ea', color: '#4a4f7a' }}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          className="text-xs px-3 py-1.5 rounded-lg border font-medium"
          style={{
            background: showLowOnly ? '#fffbeb' : '#fff',
            color: showLowOnly ? '#b45309' : '#9298c4',
            borderColor: showLowOnly ? '#f59e0b' : '#e4e6ea',
          }}
          onClick={() => setShowLowOnly(v => !v)}
        >
          ⚠ Low stock only{lowStockCount > 0 ? ` (${lowStockCount})` : ''}
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e4e6ea' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Unit</Th>
              <Th>Qty</Th>
              <Th>Reorder Level</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const low = isLow(item)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <Td><span className="font-mono" style={{ color: '#9298c4' }}>{item.id}</span></Td>
                  <Td><span className="font-medium" style={{ color: '#1a1d3b' }}>{item.name}</span></Td>
                  <Td>{item.category}</Td>
                  <Td>{item.unit}</Td>
                  <Td>
                    <span className="font-semibold" style={{ color: low ? '#b45309' : '#1a1d3b' }}>
                      {item.qty}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: low ? '#b45309' : '#4a4f7a' }}>
                      {low && '⚠ '}{item.min}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setAdjustItem(item)}
                        className="text-xs px-2 py-1 rounded-md font-medium"
                        style={{ background: '#f0f2f5', color: '#4a4f7a', border: 'none', cursor: 'pointer' }}
                      >
                        ±
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
                            Delete
                          </button>
                      }
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-xs" style={{ color: '#b0b5cc' }}>No items found.</div>
        )}
      </div>

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
