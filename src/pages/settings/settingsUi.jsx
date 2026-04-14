// Shared UI primitives for Settings sections

export function Card({ children }) {
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e4e6ea' }}>
      {children}
    </div>
  )
}

export function Field({ label, value, type = 'text', hint, onChange, disabled }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a4f7a' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
        style={{ borderColor: '#e4e6ea', color: '#1a1d3b', background: disabled ? '#f7f8fa' : '#fff' }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = '#6c63ff' }}
        onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
      />
      {hint && <div className="mt-1 text-xs" style={{ color: '#b0b5cc' }}>{hint}</div>}
    </div>
  )
}

export function Toggle({ label, hint, value, onChange }) {
  return (
    <div className="flex items-start justify-between py-3 border-b last:border-0" style={{ borderColor: '#f7f8fa' }}>
      <div className="flex-1 pr-4">
        <div className="text-xs font-medium" style={{ color: '#1a1d3b' }}>{label}</div>
        {hint && <div className="text-xs mt-0.5" style={{ color: '#b0b5cc' }}>{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200"
        style={{ background: value ? '#6c63ff' : '#e4e6ea' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
          style={{ transform: value ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  )
}

export function SaveRow({ onSave, saving, savedMsg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14 }}>
      {savedMsg && (
        <span style={{ fontSize: 12, color: savedMsg === 'Saved' ? '#22c55e' : '#dc2626' }}>{savedMsg}</span>
      )}
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          fontSize: 12, padding: '7px 18px', borderRadius: 8, border: 'none',
          background: saving ? '#b0b5cc' : '#6c63ff', color: '#fff',
          cursor: saving ? 'default' : 'pointer', fontWeight: 500
        }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
