import { useState } from 'react'
import { Card } from './settingsUi'

const PRESET_COLORS = [
  '#6c63ff', '#22c55e', '#f59e0b', '#ef4444', '#b45309',
  '#9298c4', '#64748b', '#ec4899', '#06b6d4', '#8b5cf6'
]

const ROLES = ['Admin', 'Supervisor', 'Employee']
const ROLE_COLORS = { Admin: '#6c63ff', Supervisor: '#f59e0b', Employee: '#64748b' }

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

function UserModal({ user, onClose, onSave }) {
  const isNew = !user
  const [name, setName] = useState(isNew ? '' : user.name)
  const [email, setEmail] = useState(isNew ? '' : user.email)
  const [role, setRole] = useState(isNew ? 'Employee' : user.role)
  const [color, setColor] = useState(isNew ? '#6c63ff' : user.color)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const initials = name.trim().split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    await onSave({ name: name.trim(), email: email.trim(), role, color, id: user?.id || initials })
    setSaving(false)
    onClose()
  }

  return (
    <Overlay>
      <div style={{ ...modalBox, width: 380 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d3b', marginBottom: 18 }}>
          {isNew ? 'Invite user' : 'Edit user'}
        </h3>
        <label style={labelStyle}>Full name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
          onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
        />
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
          onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
        />
        <label style={labelStyle}>Role</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${role === r ? ROLE_COLORS[r] : '#e4e6ea'}`,
                background: role === r ? ROLE_COLORS[r] + '18' : '#fff',
                color: role === r ? ROLE_COLORS[r] : '#888'
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <label style={labelStyle}>Avatar colour</label>
        <ColorPicker value={color} onChange={setColor} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: 'none', background: saving || !name.trim() ? '#b0b5cc' : '#6c63ff', color: '#fff', cursor: 'pointer' }}
          >
            {saving ? 'Saving…' : isNew ? 'Add user' : 'Save'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

export default function UsersSection({ settings, onSaved }) {
  const [userModal, setUserModal] = useState(null)
  const users = settings?.users || []

  async function handleSaveUser(userData) {
    const exists = users.find(u => u.id === userData.id)
    const updatedUsers = exists
      ? users.map(u => u.id === userData.id ? { ...u, ...userData } : u)
      : [...users, userData]
    await onSaved({ users: updatedUsers })
  }

  async function handleRemoveUser(userId) {
    await onSaved({ users: users.filter(u => u.id !== userId) })
  }

  return (
    <Card>
      {userModal !== null && (
        <UserModal
          user={userModal === 'new' ? null : userModal}
          onClose={() => setUserModal(null)}
          onSave={handleSaveUser}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b' }}>Users & roles</div>
        <button
          onClick={() => setUserModal('new')}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#6c63ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          + Invite user
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid #f0f2f5' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: u.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0
            }}>
              {u.id}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b' }}>{u.name}</div>
              <div style={{ fontSize: 11, color: '#b0b5cc' }}>{u.email}</div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: u.role === 'Admin' ? '#ede9fe' : u.role === 'Supervisor' ? '#fffbeb' : '#f4f5f7',
              color: ROLE_COLORS[u.role] || '#9298c4'
            }}>
              {u.role}
            </span>
            <button
              onClick={() => setUserModal(u)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e4e6ea', background: '#fff', color: '#9298c4', cursor: 'pointer' }}
            >
              Edit
            </button>
            <button
              onClick={() => handleRemoveUser(u.id)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {users.length === 0 && (
        <div style={{ textAlign: 'center', color: '#b0b5cc', fontSize: 12, padding: '24px 0' }}>No users yet.</div>
      )}
      <div style={{ marginTop: 14, fontSize: 11, color: '#b0b5cc', background: '#f7f8fa', borderRadius: 8, padding: '8px 12px' }}>
        Note: Login and role-based access control is planned for a future release.
      </div>
    </Card>
  )
}
