import { useState } from 'react'
import { useGet, apiFetch } from '../hooks/useApi'
import AddEditToolModal from './tools/AddEditToolModal'
import CheckoutModal from './tools/CheckoutModal'

function elapsed(isoDate) {
  if (!isoDate) return ''
  const ms = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  return `${Math.floor(hrs / 24)}d`
}

const STATUS_CFG = {
  in:      { label: 'Available',   color: '#16a34a', bg: '#e8f8f0' },
  out:     { label: 'Checked Out', color: '#92400e', bg: '#fffbeb' },
  overdue: { label: 'Overdue',     color: '#dc2626', bg: '#fef2f2' },
  service: { label: 'Due Service', color: '#b45309', bg: '#fef3c7' },
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

function Pill({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: '#555', bg: '#eee' }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

export default function Tools() {
  const { data: toolsRaw, refetch } = useGet('/tools')
  const { data: employeesData } = useGet('/employees')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTool, setEditTool] = useState(null)
  const [checkoutTool, setCheckoutTool] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const tools = toolsRaw || []
  const employees = employeesData?.employees || []
  const categories = [...new Set(tools.map(t => t.category).filter(Boolean))].sort()

  const filtered = tools.filter(t => {
    const matchSearch = !search ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.serial?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || t.category === categoryFilter
    return matchSearch && matchCat
  })

  const available = tools.filter(t => t.status === 'in').length
  const checkedOut = tools.filter(t => t.status === 'out' || t.status === 'overdue').length

  async function handleCheckin(tool) {
    await apiFetch(`/tools/${tool.id}/checkin`, { method: 'POST' })
    refetch()
  }

  async function handleDelete(id) {
    await apiFetch(`/tools/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    refetch()
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Available', value: available, color: '#16a34a' },
          { label: 'Checked Out', value: checkedOut, color: checkedOut > 0 ? '#b45309' : '#1a1d3b' },
          { label: 'Total', value: tools.length },
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
          placeholder="Search name or serial..."
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
          className="ml-auto text-xs px-3 py-1.5 rounded-lg text-white font-medium"
          style={{ background: '#6c63ff' }}
          onClick={() => setShowAdd(true)}
        >
          + Add Tool
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e4e6ea' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>ID</Th><Th>Name</Th><Th>Category</Th><Th>Dept</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <Td><span className="font-mono" style={{ color: '#9298c4' }}>{t.id}</span></Td>
                <Td>
                  <div className="font-medium" style={{ color: '#1a1d3b' }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: '#b0b5cc' }}>{t.serial}</div>
                </Td>
                <Td>{t.category}</Td>
                <Td>{t.dept}</Td>
                <Td>
                  <Pill status={t.status} />
                  {(t.status === 'out' || t.status === 'overdue') && (
                    <div style={{ fontSize: 10, color: '#9298c4', marginTop: 2 }}>
                      {t.checkedOutTo || t.assignedTo} · {elapsed(t.checkedOut)}
                    </div>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(t.status === 'out' || t.status === 'overdue')
                      ? <button onClick={() => handleCheckin(t)} className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: '#e8f8f0', color: '#16a34a', border: 'none', cursor: 'pointer' }}>Check In</button>
                      : t.status === 'in' && <button onClick={() => setCheckoutTool(t)} className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: '#fffbeb', color: '#92400e', border: 'none', cursor: 'pointer' }}>Check Out</button>
                    }
                    <button onClick={() => setEditTool(t)} className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: '#f0f2f5', color: '#4a4f7a', border: 'none', cursor: 'pointer' }}>Edit</button>
                    {deleteConfirm === t.id
                      ? <span className="flex items-center gap-1">
                          <span style={{ color: '#dc2626', fontSize: 11 }}>Delete?</span>
                          <button onClick={() => handleDelete(t.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ background: '#f0f2f5', color: '#555', border: 'none', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>No</button>
                        </span>
                      : <button onClick={() => setDeleteConfirm(t.id)} className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>Delete</button>
                    }
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-xs" style={{ color: '#b0b5cc' }}>No tools found.</div>
        )}
      </div>

      {showAdd && <AddEditToolModal categories={categories} onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); refetch() }} />}
      {editTool && <AddEditToolModal tool={editTool} categories={categories} onClose={() => setEditTool(null)} onSave={() => { setEditTool(null); refetch() }} />}
      {checkoutTool && <CheckoutModal tool={checkoutTool} employees={employees} onClose={() => setCheckoutTool(null)} onConfirm={() => { setCheckoutTool(null); refetch() }} />}
    </div>
  )
}
