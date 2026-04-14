import { useState } from 'react'

const metrics = [
  { label: 'Total items', value: '124', sub: 'In catalogue' },
  { label: 'Low stock', value: '6', sub: 'Below minimum level', color: '#f59e0b' },
  { label: 'Out of stock', value: '2', sub: 'Blocking production', color: '#ef4444' },
  { label: 'Pending orders', value: '3', sub: 'Awaiting delivery' },
]

const stock = [
  { id: 'S001', name: 'Conduit 20mm', category: 'Electrical', unit: 'metres', qty: 12, min: 50, onOrder: 100, orderDate: '24 Mar', usedBy: ['SANDF Comms Vehicle'], status: 'low' },
  { id: 'S002', name: 'Cable 2.5mm TwinEarth', category: 'Electrical', unit: 'metres', qty: 0, min: 100, onOrder: 200, orderDate: '23 Mar', usedBy: ['City of CT Canteen', 'SAPS Clinic #14'], status: 'out' },
  { id: 'S003', name: '18mm Plywood sheets', category: 'Cabinet Making', unit: 'sheets', qty: 8, min: 20, onOrder: 0, orderDate: '—', usedBy: ['Glencore Mobile Lab'], status: 'low' },
  { id: 'S004', name: 'MIG wire 0.8mm', category: 'Welding', unit: 'rolls', qty: 4, min: 10, onOrder: 10, orderDate: '25 Mar', usedBy: ['SANDF Comms Vehicle'], status: 'low' },
  { id: 'S005', name: 'PVC pipe 15mm', category: 'Plumbing', unit: 'metres', qty: 45, min: 30, onOrder: 0, orderDate: '—', usedBy: [], status: 'ok' },
  { id: 'S006', name: 'Stainless steel screws M6', category: 'Fasteners', unit: 'box', qty: 22, min: 10, onOrder: 0, orderDate: '—', usedBy: [], status: 'ok' },
  { id: 'S007', name: 'Aluminium angle 40x40', category: 'Structural', unit: 'metres', qty: 0, min: 20, onOrder: 30, orderDate: '22 Mar', usedBy: ['SAPS Vehicle #15'], status: 'out' },
  { id: 'S008', name: 'Silicone sealant', category: 'Consumables', unit: 'tubes', qty: 6, min: 15, onOrder: 0, orderDate: '—', usedBy: [], status: 'low' },
  { id: 'S009', name: 'Brass fittings 15mm', category: 'Plumbing', unit: 'units', qty: 34, min: 20, onOrder: 0, orderDate: '—', usedBy: [], status: 'ok' },
  { id: 'S010', name: 'Welding rods 3.2mm', category: 'Welding', unit: 'kg', qty: 18, min: 10, onOrder: 0, orderDate: '—', usedBy: [], status: 'ok' },
]

const statusConfig = {
  ok: { label: 'In stock', color: '#16a34a', bg: '#e8f8f0' },
  low: { label: 'Low stock', color: '#b45309', bg: '#fffbeb' },
  out: { label: 'Out of stock', color: '#dc2626', bg: '#fef2f2' },
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
  return (
    <td className="px-3 py-2.5 text-xs border-b" style={{ color: '#4a4f7a', borderColor: '#f7f8fa' }}>
      {children}
    </td>
  )
}

function Pill({ text, color, bg }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>
      {text}
    </span>
  )
}

function StockBar({ qty, min }) {
  const pct = min === 0 ? 100 : Math.min(Math.round((qty / min) * 100), 100)
  const color = qty === 0 ? '#ef4444' : pct < 50 ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#f0f2f5', minWidth: 60 }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color, minWidth: 28, textAlign: 'right' }}>{qty}</span>
    </div>
  )
}

export default function Stock() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filters = [
    { id: 'all', label: 'All items' },
    { id: 'out', label: 'Out of stock' },
    { id: 'low', label: 'Low stock' },
    { id: 'ok', label: 'In stock' },
  ]

  const filtered = stock.filter(s => {
    const matchFilter = filter === 'all' || s.status === filter
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl p-3 border" style={{ borderColor: '#e4e6ea' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#9298c4' }}>{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color || '#1a1d3b', lineHeight: 1 }}>{m.value}</div>
            <div className="text-xs mt-1" style={{ color: '#b0b5cc' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{
                background: filter === f.id ? '#6c63ff15' : '#fff',
                color: filter === f.id ? '#6c63ff' : '#9298c4',
                borderColor: filter === f.id ? '#6c63ff30' : '#e4e6ea',
              }}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="text-xs px-3 py-1.5 rounded-lg border outline-none ml-auto"
          style={{ borderColor: '#e4e6ea', width: 200 }}
          placeholder="Search items or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#6c63ff' }}>
          + Add item
        </button>
        <button className="text-xs px-3 py-1.5 rounded-lg border font-medium" style={{ borderColor: '#e4e6ea', color: '#5a5f8a' }}>
          Import CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e4e6ea' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Item ID</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Unit</Th>
              <Th>Qty vs minimum</Th>
              <Th>Minimum</Th>
              <Th>On order</Th>
              <Th>Order date</Th>
              <Th>Used by</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const st = statusConfig[s.status]
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <Td><span className="font-mono" style={{ color: '#9298c4' }}>{s.id}</span></Td>
                  <Td><span className="font-medium" style={{ color: '#1a1d3b' }}>{s.name}</span></Td>
                  <Td>{s.category}</Td>
                  <Td>{s.unit}</Td>
                  <Td><StockBar qty={s.qty} min={s.min} /></Td>
                  <Td>{s.min} {s.unit}</Td>
                  <Td>
                    {s.onOrder > 0
                      ? <span className="font-medium" style={{ color: '#6c63ff' }}>{s.onOrder} {s.unit}</span>
                      : <span style={{ color: '#b0b5cc' }}>—</span>
                    }
                  </Td>
                  <Td>{s.orderDate}</Td>
                  <Td>
                    {s.usedBy.length > 0
                      ? <div>{s.usedBy.map((j, ji) => (
                          <div key={ji} className="text-xs" style={{ color: s.status !== 'ok' ? '#dc2626' : '#4a4f7a' }}>{j}</div>
                        ))}</div>
                      : <span style={{ color: '#b0b5cc' }}>—</span>
                    }
                  </Td>
                  <Td><Pill text={st.label} color={st.color} bg={st.bg} /></Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}