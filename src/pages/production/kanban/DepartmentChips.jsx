const labelStyle = { fontSize: 11, fontWeight: 600, color: '#9298c4', marginBottom: 3, display: 'block' }

export default function DepartmentChips({ task, departments, onTaskPatch, isUpdating }) {
  if (!(Array.isArray(departments) && departments.length > 0)) return null

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <label style={labelStyle}>Departments</label>
        {Array.isArray(task.departments) && task.departments.length > 0 && (
          <button
            onClick={() => onTaskPatch(task, { departments: [] })}
            disabled={isUpdating}
            style={{ fontSize: 10, color: '#9298c4', background: 'none', border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Clear / use auto
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {departments.map(dept => {
          const manualDepts = Array.isArray(task.departments) ? task.departments : []
          const isOn = manualDepts.includes(dept.name)
          const next = isOn ? manualDepts.filter(d => d !== dept.name) : [...manualDepts, dept.name]
          return (
            <button
              key={dept.name}
              onClick={() => onTaskPatch(task, { departments: next })}
              disabled={isUpdating}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                border: `1px solid ${isOn ? dept.color : '#e4e6ea'}`,
                background: isOn ? dept.color : 'transparent',
                color: isOn ? '#fff' : '#6b7280',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                fontWeight: isOn ? 600 : 400,
                opacity: isUpdating ? 0.5 : 1,
              }}
            >
              {dept.name}
            </button>
          )
        })}
      </div>
      {!(Array.isArray(task.departments) && task.departments.length > 0) && (
        <div style={{ fontSize: 10, color: '#b0b5cc', marginTop: 3 }}>
          Auto — derived from component codes
        </div>
      )}
    </div>
  )
}
