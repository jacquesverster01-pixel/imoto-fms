import { useState } from 'react'
import { useGet } from '../../hooks/useApi'
import { todayStr, daysAgoStr } from '../../utils/time'
import OHSNotifications from './ohs/OHSNotifications'
import OHSDashboard from './ohs/OHSDashboard'
import EquipmentTab from './ohs/EquipmentTab'
import RiskRegisterTab from './ohs/RiskRegisterTab'
import FactoryMapTab from './ohs/FactoryMapTab'
import AppointmentsTab from './ohs/AppointmentsTab'
import InspectionRunsTab from './ohs/InspectionRunsTab'
import InspectionTemplatesTab from './ohs/InspectionTemplatesTab'
import OHSLibraryTab from './ohs/OHSLibraryTab'
import OHSLawTab from './ohs/OHSLawTab'
import ComplianceCalendarTab from './ohs/ComplianceCalendarTab'

export default function OHSTab({ employees, settingsData }) {
  const { data: ohsData,    refetch: refreshOhs } = useGet('/ohs')
  const { data: aptRaw                          } = useGet('/ohs-appointments')
  const { data: aptTypesRaw                     } = useGet('/ohs-appointment-types')
  const { data: equipRaw                        } = useGet('/ohs-equipment')
  const { data: activeRaw                       } = useGet('/ohs-inspections-active')

  const incidents         = Array.isArray(ohsData)     ? ohsData     : []
  const appointments      = Array.isArray(aptRaw)      ? aptRaw      : []
  const appointmentTypes  = Array.isArray(aptTypesRaw) ? aptTypesRaw : []
  const allEquipment      = Array.isArray(equipRaw)    ? equipRaw    : []
  const activeInspections = Array.isArray(activeRaw)   ? activeRaw   : []

  const [activeSection, setActiveSection] = useState('monitor')
  const [activeTab,     setActiveTab]     = useState('dashboard')

  const today    = todayStr()
  const cutoff14 = daysAgoStr(14)

  const alerts = []
  incidents.forEach(inc => {
    ;(inc.correctiveActions || []).forEach(a => {
      if (a.status !== 'Done' && a.dueDate && a.dueDate < today) {
        alerts.push({
          key: `ca-${inc.id}-${a.id}`, severity: 'High',
          title: `Overdue action: ${a.description}`,
          detail: `On incident "${inc.title}" — assigned to ${a.assignedTo || 'unassigned'}, was due ${a.dueDate}`,
        })
      }
    })
  })
  incidents.forEach(inc => {
    if (['Open', 'Assigned'].includes(inc.status) && inc.date && inc.date < cutoff14) {
      alerts.push({
        key: `old-${inc.id}`, severity: 'Medium',
        title: `Incident open for over 14 days: "${inc.title}"`,
        detail: `Opened on ${inc.date}`,
      })
    }
  })
  activeInspections.forEach(ins => {
    if (ins.status === 'pending' && ins.dueDate && ins.dueDate < today) {
      alerts.push({
        key: `ins-${ins.id}`, severity: 'Medium',
        title: `Overdue inspection: ${ins.cadence} for ${ins.assigneeName}`,
        detail: `Was due ${ins.dueDate}`,
      })
    }
  })

  const SECTIONS = [
    {
      key: 'monitor',     label: 'Monitor',
      tabs: [
        { key: 'dashboard',     label: 'Dashboard' },
        { key: 'incidents',     label: 'Incidents' },
        { key: 'risks',         label: 'Risk Register' },
      ],
    },
    {
      key: 'inspections', label: 'Inspections',
      tabs: [
        { key: 'inspections',   label: 'Inspections' },
        { key: 'templates',     label: 'Templates' },
        { key: 'notifications', label: 'Notifications' },
      ],
    },
    {
      key: 'resources',   label: 'Resources',
      tabs: [
        { key: 'equipment',     label: 'Equipment' },
        { key: 'appointments',  label: 'Appointments' },
        { key: 'calendar',      label: 'Compliance Calendar' },
      ],
    },
    {
      key: 'site',        label: 'Site',
      tabs: [
        { key: 'map',           label: 'Factory Map' },
        { key: 'library',       label: 'Library' },
        { key: 'law',           label: 'Law Reference' },
      ],
    },
  ]

  const currentSection = SECTIONS.find(s => s.key === activeSection)

  function handleSectionClick(section) {
    setActiveSection(section.key)
    setActiveTab(section.tabs[0].key)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Top-level section pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {SECTIONS.map(section => (
          <button
            key={section.key}
            onClick={() => handleSectionClick(section)}
            style={{
              padding: '7px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeSection === section.key ? '#6c63ff' : '#2a2a3a',
              color: activeSection === section.key ? '#fff' : '#9ca3af',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Secondary tab bar — underline style */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #2a2a3a', marginBottom: 20 }}>
        {currentSection.tabs.map(({ key, label }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '8px 20px', background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                color: isActive ? '#6c63ff' : '#9ca3af',
                borderBottom: isActive ? '2px solid #6c63ff' : '2px solid transparent',
                marginBottom: -2,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {label}
              {key === 'notifications' && alerts.length > 0 && (
                <span style={{
                  marginLeft: 6, borderRadius: 10, padding: '1px 6px', fontSize: 11, color: '#fff',
                  background: isActive ? 'rgba(108,99,255,0.4)' : '#ef4444',
                }}>
                  {alerts.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeTab === 'dashboard'     && (
        <OHSDashboard
          incidents={incidents}
          refreshOhs={refreshOhs}
          employees={employees || []}
          appointments={appointments}
          appointmentTypes={appointmentTypes}
          allEquipment={allEquipment}
        />
      )}
      {activeTab === 'incidents'     && (
        <OHSDashboard
          incidents={incidents}
          refreshOhs={refreshOhs}
          employees={employees || []}
          appointments={appointments}
          appointmentTypes={appointmentTypes}
          allEquipment={allEquipment}
          defaultView="incidents"
        />
      )}
      {activeTab === 'inspections'   && <InspectionRunsTab />}
      {activeTab === 'templates'     && <InspectionTemplatesTab />}
      {activeTab === 'notifications' && <OHSNotifications alerts={alerts} />}
      {activeTab === 'equipment'     && <EquipmentTab settingsData={settingsData} />}
      {activeTab === 'risks'         && <RiskRegisterTab settingsData={settingsData} />}
      {activeTab === 'map'           && <FactoryMapTab />}
      {activeTab === 'appointments'  && <AppointmentsTab />}
      {activeTab === 'library'       && <OHSLibraryTab />}
      {activeTab === 'law'           && <OHSLawTab />}
      {activeTab === 'calendar'      && <ComplianceCalendarTab />}
    </div>
  )
}
