const navItems = [
  {
    section: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    ]
  },
  {
    section: 'Production',
    items: [
      { id: 'production',           label: 'Production overview',  icon: 'grid' },
      { id: 'production-planner',   label: 'Production Planner',   icon: 'gantt' },
      { id: 'department-boards',    label: 'Department boards',    icon: 'columns' },
    ]
  },
  {
    section: 'Operations',
    items: [
      { id: 'tools', label: 'Tool tracker', icon: 'tool' }, // TODO: wire badge to dashboard API tools.overdueCount
      { id: 'inventory', label: 'Inventory', icon: 'box' },
    ]
  },
  {
    section: 'Human Resources',
    items: [
      { id: 'time-attendance', label: 'Time & Attendance', icon: 'clock' },
      { id: 'employees', label: 'Employees', icon: 'users' },
      { id: 'leave-management', label: 'Leave management', icon: 'calendar' },
      { id: 'disciplinary', label: 'Disciplinary', icon: 'alert' },
      { id: 'health-safety', label: 'Health & Safety', icon: 'shield' },
    ]
  },
  {
    section: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ]
  }
]

const icons = {
  home: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  columns: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="18" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>,
  grid: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  gantt: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><rect x="5" y="4" width="7" height="4" rx="1"/><rect x="11" y="10" width="6" height="4" rx="1"/><rect x="7" y="16" width="9" height="4" rx="1"/></svg>,
  list: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  tool: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  box: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  truck: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  users: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  clock: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  shield: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  calendar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  alert: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <div className="w-52 flex-shrink-0 flex flex-col" style={{ background: '#1e1f3b' }}>

      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="text-white font-semibold text-sm tracking-wide">iMoto FMS</div>
        <div className="text-xs mt-0.5" style={{ color: '#6b6f9e' }}>Factory Management System</div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2">
        {navItems.map(group => (
          <div key={group.section}>
            <div className="px-3 pt-4 pb-1 text-xs font-medium uppercase tracking-widest" style={{ color: '#4d5080' }}>
              {group.section}
            </div>
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg text-left transition-colors duration-100"
                style={{
                  width: 'calc(100% - 12px)',
                  color: activePage === item.id ? '#fff' : '#9298c4',
                  background: activePage === item.id ? '#6c63ff' : 'transparent',
                }}
                onMouseEnter={e => { if (activePage !== item.id) e.currentTarget.style.background = '#272948' }}
                onMouseLeave={e => { if (activePage !== item.id) e.currentTarget.style.background = 'transparent' }}
              >
                {icons[item.icon]}
                <span className="text-xs flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: item.badgeColor === 'red' ? '#ef4444' : '#f59e0b', fontSize: '9px' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ background: '#6c63ff' }}>JD</div>
          <div>
            <div className="text-xs font-medium" style={{ color: '#c5c8e8' }}>Jacques D</div>
            <div style={{ fontSize: '10px', color: '#4d5080' }}>Admin</div>
          </div>
        </div>
      </div>

    </div>
  )
}