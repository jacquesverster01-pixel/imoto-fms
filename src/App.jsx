import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Production from './pages/Production'
import HR from './pages/HR'
import Tools from './pages/Tools'
import Inventory from './pages/Inventory'
import Settings from './pages/Settings'
import InspectionPage from './pages/InspectionPage'

const inspectionMatch = window.location.pathname.match(/^\/inspection\/(.+)$/)

const pageTitles = {
  dashboard: 'Dashboard',
  production: 'Production overview',
  tools: 'Tool tracker',
  inventory: 'Inventory',
  'time-attendance': 'Time & Attendance',
  employees: 'Employees',
  'leave-management': 'Leave management',
  disciplinary: 'Disciplinary',
  'health-safety': 'Health & Safety',
  settings: 'Settings',
}

function PageContent({ page, onNavigate }) {
  switch (page) {
    case 'dashboard': return <Dashboard onNavigate={onNavigate} />
    case 'production': return <Production />
    case 'time-attendance': return <HR section="time-attendance" />
    case 'employees': return <HR section="employees" />
    case 'leave-management': return <HR section="leave-management" />
    case 'disciplinary': return <HR section="disciplinary" />
    case 'health-safety': return <HR section="health-safety" />
    case 'tools': return <Tools />
    case 'inventory': return <Inventory />
    case 'settings': return <Settings />
    default: return (
      <div className="flex items-center justify-center h-40">
        <span className="text-sm" style={{ color: '#b0b5cc' }}>{pageTitles[page]} — coming soon</span>
      </div>
    )
  }
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')

  if (inspectionMatch) {
    return <InspectionPage inspectionId={inspectionMatch[1]} />
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f2f5' }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar title={pageTitles[activePage]} />
        <div className="flex-1 overflow-y-auto p-4">
          <PageContent page={activePage} onNavigate={setActivePage} />
        </div>
      </div>
    </div>
  )
}
