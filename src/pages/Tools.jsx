import { useState } from 'react'

const tools = [
  { id: 'T001', name: 'Angle grinder #4', category: 'Power tools', serial: 'AG-2019-004', dept: 'Workshop', assignedTo: 'Mike Olivier', checkedOut: '20 Mar', due: '23 Mar', status: 'overdue', condition: 'Needs repair' },
  { id: 'T002', name: 'MIG welder #2', category: 'Welding', serial: 'MW-2021-002', dept: 'Welding', assignedTo: 'Thabo Nkosi', checkedOut: '23 Mar', due: '25 Mar', status: 'out', condition: 'Good' },
  { id: 'T003', name: 'Circular saw #1', category: 'Power tools', serial: 'CS-2020-001', dept: 'Cabinet Making', assignedTo: 'Sarah Jacobs', checkedOut: '22 Mar', due: '24 Mar', status: 'overdue', condition: 'Good' },
  { id: 'T004', name: 'Cordless drill #3', category: 'Power tools', serial: 'CD-2022-003', dept: 'Assembly', assignedTo: '—', checkedOut: '—', due: '—', status: 'in', condition: 'Good' },
  { id: 'T005', name: 'Pipe bender #1', category: 'Plumbing', serial: 'PB-2018-001', dept: 'Plumbing', assignedTo: 'Ruan Botha', checkedOut: '21 Mar', due: '23 Mar', status: 'overdue', condition: 'Good' },
  { id: 'T006', name: 'Oscillating multi-tool', category: 'Power tools', serial: 'OM-2023-001', dept: 'Workshop', assignedTo: '—', checkedOut: '—', due: '—', status: 'in', condition: 'Good' },
  { id: 'T007', name: 'TIG welder #1', category: 'Welding', serial: 'TW-2020-001', dept: 'Welding', assignedTo: '—', checkedOut: '—', due: '—', status: 'service', condition: 'Due service' },
  { id: 'T008', name: 'Jigsaw #2', category: 'Power tools', serial: 'JS-2021-002', dept: 'Cabinet Making', assignedTo: 'Sarah Jacobs', checkedOut: '23 Mar', due: '25 Mar', status: 'out', condition: 'Good' },
]

const metrics = [
  { label: 'Total tools', value: '48', sub: 'In catalogue' },
  { label: 'Checked out', value: '11', sub: 'Currently in use' },
  { label: 'Overdue', value: '4', sub: 'Past return date', color: '#ef4444' },
  { label: 'Need service', value: '2', sub: 'Due for maintenance', color: '#f59e0b' },
]

const statusConfig = {
  in: { label: 'Available', color: '#16a34a', bg: '#e8f8f0' },
  out: { label: 'Checked out', color: '#1d4ed8', bg: '#eff6ff' },
  overdue: { label: 'Overdue', color: '#dc2626', bg: '#fef2f2' },
  service: { label: 'Due service', color: '#b45309', bg: '#fffbeb' },
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

export default function Tools() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filters = [
    { id: 'all', label: 'All tools' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'out', label: 'Checked out' },
    { id: 'in', label: 'Available' },
    { id: 'service', label: 'Need service' },
  ]

  const filtered = tools.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(search.toLowerCase())
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
          style={{ borderColor: '#e4e6ea', width: 180 }}
          placeholder="Search tools or assignee..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#6c63ff' }}>
          + Add tool
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e4e6ea' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Tool ID</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Department</Th>
              <Th>Assigned to</Th>
              <Th>Checked out</Th>
              <Th>Due back</Th>
              <Th>Condition</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const s = statusConfig[t.status]
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <Td><span className="font-mono" style={{ color: '#9298c4' }}>{t.id}</span></Td>
                  <Td>
                    <div className="font-medium" style={{ color: '#1a1d3b' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: '#b0b5cc' }}>{t.serial}</div>
                  </Td>
                  <Td>{t.category}</Td>
                  <Td>{t.dept}</Td>
                  <Td>{t.assignedTo}</Td>
                  <Td>{t.checkedOut}</Td>
                  <Td>
                    <span style={{ color: t.status === 'overdue' ? '#dc2626' : '#4a4f7a', fontWeight: t.status === 'overdue' ? 600 : 400 }}>
                      {t.due}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: t.condition === 'Needs repair' ? '#dc2626' : t.condition === 'Due service' ? '#b45309' : '#16a34a', fontWeight: 500 }}>
                      {t.condition}
                    </span>
                  </Td>
                  <Td><Pill text={s.label} color={s.color} bg={s.bg} /></Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}