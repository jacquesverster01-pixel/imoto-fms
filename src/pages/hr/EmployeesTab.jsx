import { useState } from 'react'
import { styles } from '../../utils/hrStyles'
import AddEmployeeModal from './AddEmployeeModal'
import EmployeeEditModal from './EmployeeEditModal'
import EmployeeDetailModal from './EmployeeDetailModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_SLOTS = [
  { key: 'cv',             label: 'CV / Résumé' },
  { key: 'driversLicense', label: "Driver's Licence" },
  { key: 'contract',       label: 'Signed Contract' },
  { key: 'teamInfoSheet',  label: 'Team Info Sheet' },
  { key: 'workPermit',     label: 'Work Permit' },
]

function getOutstandingDocCount(emp) {
  const docs = emp.documents || {}
  return DOC_SLOTS.filter(slot => !docs[slot.key]).length
}

// AddEmployeeModal    → ./AddEmployeeModal.jsx
// EmployeeEditModal   → ./EmployeeEditModal.jsx
// EmployeeDetailModal → ./EmployeeDetailModal.jsx

// ─── EmployeesTab ─────────────────────────────────────────────────────────────

export default function EmployeesTab({ employees, settingsData, refetchEmployees }) {
  const [showAdd, setShowAdd] = useState(false)
  const [viewEmployee, setViewEmployee] = useState(null)
  const [editEmployee, setEditEmployee] = useState(null)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')

  const departments = settingsData?.departments || []
  const shifts = settingsData?.shifts || []
  const depts = departments.map(d => d.name)

  const filtered = employees.filter(emp => {
    const nameMatch = !search || emp.name.toLowerCase().includes(search.toLowerCase())
    const deptMatch = deptFilter === 'all' || emp.dept === deptFilter
    return nameMatch && deptMatch
  })

  function exportCSV() {
    const header = 'ID,Name,Department,ZK User ID\n'
    const rows = employees.map(e => `"${e.id}","${e.name}","${e.dept || ''}","${e.zkUserId || ''}"`)
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  function handleSaved() {
    setShowAdd(false)
    setEditEmployee(null)
    refetchEmployees()
  }

  return (
    <div>
      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onSaved={handleSaved} departments={departments} />}
      {viewEmployee && !editEmployee && (
        <EmployeeDetailModal
          employee={viewEmployee}
          onClose={() => setViewEmployee(null)}
          onEdit={() => { setEditEmployee(viewEmployee); setViewEmployee(null) }}
        />
      )}
      {editEmployee && <EmployeeEditModal employee={editEmployee} onClose={() => setEditEmployee(null)} onSaved={handleSaved} departments={departments} shifts={shifts} />}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...styles.input, marginBottom: 0, width: 200 }}
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...styles.input, marginBottom: 0, width: 180 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="all">All departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={styles.btnSecondary} onClick={exportCSV}>Export CSV</button>
          <button style={styles.btnPrimary} onClick={() => setShowAdd(true)}>+ Add Employee</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>
        {filtered.length} employee{filtered.length !== 1 ? 's' : ''}{deptFilter !== 'all' ? ` in ${deptFilter}` : ''}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map(emp => {
          const outCount = getOutstandingDocCount(emp)
          return (
            <div
              key={emp.id}
              onClick={() => setViewEmployee(emp)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: '#fafafa', border: '1px solid #f0f2f5', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: emp.color || '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e1f3b' }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>
                  {emp.dept || <span style={{ color: '#f59e0b' }}>No department set</span>}
                  {emp.zkUserId && <span style={{ marginLeft: 8 }}>· ZK {emp.zkUserId}</span>}
                </div>
              </div>
              {outCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fff7ed', color: '#d97706', border: '1px solid #fcd34d', flexShrink: 0 }}>
                  {outCount} doc{outCount !== 1 ? 's' : ''} missing
                </span>
              )}
              <div style={{ fontSize: 11, color: '#ccc' }}>{emp.id}</div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#ccc', fontSize: 14 }}>No employees found</div>
        )}
      </div>
    </div>
  )
}
