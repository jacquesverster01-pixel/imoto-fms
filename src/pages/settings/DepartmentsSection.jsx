import { useState } from 'react'
import { useGet, apiFetch } from '../../hooks/useApi'
import { Card } from './settingsUi'

const PRESET_COLORS = [
  '#6c63ff', '#22c55e', '#f59e0b', '#ef4444', '#b45309',
  '#9298c4', '#64748b', '#ec4899', '#06b6d4', '#8b5cf6'
]

const modalBox = {
  background: '#fff', borderRadius: 14, padding: 24,
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)'
}
const cancelBtn = {
  fontSize: 12, padding: '7px 16px', borderRadius: 8,
  border: '1px solid #e4e6ea', background: '#fff', cursor: 'pointer', color: '#555'
}
const inputStyle = {
  width: '100%', fontSize: 12, padding: '8px 10px', borderRadius: 8,
  border: '1px solid #e4e6ea', outline: 'none', marginBottom: 12,
  color: '#1a1d3b', boxSizing: 'border-box'
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#4a4f7a', marginBottom: 6
}

function Overlay({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {children}
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: 26, height: 26, borderRadius: '50%', background: c, padding: 0,
            border: value === c ? '3px solid #1a1d3b' : '2px solid transparent', cursor: 'pointer'
          }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        title="Custom colour"
        style={{ width: 26, height: 26, padding: 2, borderRadius: 6, border: '1px solid #e4e6ea', cursor: 'pointer' }}
      />
    </div>
  )
}

function DeptModal({ dept, onClose, onSave }) {
  const isNew = !dept
  const [name, setName] = useState(isNew ? '' : dept.name)
  const [color, setColor] = useState(isNew ? '#6c63ff' : dept.color)
  const [renameEmps, setRenameEmps] = useState(false)
  const [saving, setSaving] = useState(false)

  const nameChanged = !isNew && name.trim() !== dept.name

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), color, oldName: dept?.name, renameEmps: nameChanged && renameEmps })
    setSaving(false)
    onClose()
  }

  return (
    <Overlay>
      <div style={{ ...modalBox, width: 360 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d3b', marginBottom: 18 }}>
          {isNew ? 'Add department' : 'Edit department'}
        </h3>
        <label style={labelStyle}>Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }}
          onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
          onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
        />
        <label style={labelStyle}>Colour</label>
        <ColorPicker value={color} onChange={setColor} />
        {nameChanged && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#555', marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={renameEmps} onChange={e => setRenameEmps(e.target.checked)} />
            Also rename this department on all employee records
          </label>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: 'none', background: saving || !name.trim() ? '#b0b5cc' : '#6c63ff', color: '#fff', cursor: 'pointer' }}
          >
            {saving ? 'Saving…' : isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

export default function DepartmentsSection({ settings, onSaved }) {
  const [deptModal, setDeptModal] = useState(null)
  const { data: empData } = useGet('/employees')
  const employees = empData?.employees || []
  const departments = settings?.departments || []

  function staffCount(deptName) {
    return employees.filter(e => e.dept === deptName).length
  }

  async function handleSaveDept({ name, color, oldName, renameEmps }) {
    let updatedDepts
    if (!oldName) {
      updatedDepts = [...departments, { name, color }]
    } else {
      updatedDepts = departments.map(d => d.name === oldName ? { name, color } : d)
    }
    if (renameEmps && oldName && name !== oldName) {
      await apiFetch('/employees/rename-dept', { method: 'POST', body: JSON.stringify({ from: oldName, to: name }) })
    }
    await onSaved({ departments: updatedDepts })
  }

  return (
    <Card>
      {deptModal !== null && (
        <DeptModal
          dept={deptModal === 'add' ? null : deptModal}
          onClose={() => setDeptModal(null)}
          onSave={handleSaveDept}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b' }}>Departments</div>
        <button
          onClick={() => setDeptModal('add')}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#6c63ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          + Add department
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {departments.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #f0f2f5' }}>
            <div style={{ width: 8, height: 40, borderRadius: 4, background: d.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b' }}>{d.name}</div>
              <div style={{ fontSize: 11, color: '#b0b5cc' }}>
                {staffCount(d.name)} staff member{staffCount(d.name) !== 1 ? 's' : ''}
              </div>
            </div>
            <button
              onClick={() => setDeptModal(d)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e4e6ea', background: '#fff', color: '#9298c4', cursor: 'pointer' }}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      {departments.length === 0 && (
        <div style={{ textAlign: 'center', color: '#b0b5cc', fontSize: 12, padding: '24px 0' }}>
          No departments yet. Add one above.
        </div>
      )}
    </Card>
  )
}
