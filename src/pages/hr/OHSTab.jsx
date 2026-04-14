import { useState } from 'react'
import { useGet } from '../../hooks/useApi'
import { todayStr } from '../../utils/time'
import { daysAgoStr } from '../../utils/ohs'
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

  const [ohsSubTab, setOhsSubTab] = useState('dashboard')

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

  const SUB_TABS = [
    { key: 'dashboard',    label: 'Dashboard' },
    { key: 'inspections',  label: 'Inspections' },
    { key: 'templates',    label: 'Templates' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'equipment',    label: 'Equipment' },
    { key: 'risks',        label: 'Risk Register' },
    { key: 'map',          label: 'Factory Map' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'library',      label: 'OHS Library' },
    { key: 'law',          label: 'OHS Law' },
    { key: 'calendar',     label: 'Calendar' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Scrollable tab bar */}
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
          {SUB_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setOhsSubTab(key)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: ohsSubTab === key ? '#6c63ff' : '#f3f4f6',
                color: ohsSubTab === key ? '#fff' : '#374151',
              }}
            >
              {label}
              {key === 'notifications' && alerts.length > 0 && (
                <span style={{
                  marginLeft: 6, borderRadius: 10, padding: '1px 6px', fontSize: 11, color: '#fff',
                  background: ohsSubTab === 'notifications' ? 'rgba(255,255,255,0.3)' : '#ef4444',
                }}>
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {ohsSubTab === 'dashboard'    && (
        <OHSDashboard
          incidents={incidents}
          refreshOhs={refreshOhs}
          employees={employees || []}
          appointments={appointments}
          appointmentTypes={appointmentTypes}
          allEquipment={allEquipment}
        />
      )}
      {ohsSubTab === 'inspections'  && <InspectionRunsTab />}
      {ohsSubTab === 'templates'    && <InspectionTemplatesTab />}
      {ohsSubTab === 'notifications' && <OHSNotifications alerts={alerts} />}
      {ohsSubTab === 'equipment'    && <EquipmentTab settingsData={settingsData} />}
      {ohsSubTab === 'risks'        && <RiskRegisterTab settingsData={settingsData} />}
      {ohsSubTab === 'map'          && <FactoryMapTab />}
      {ohsSubTab === 'appointments' && <AppointmentsTab />}
      {ohsSubTab === 'library'      && <OHSLibraryTab />}
      {ohsSubTab === 'law'          && <OHSLawTab />}
      {ohsSubTab === 'calendar'     && <ComplianceCalendarTab />}
    </div>
  )
}
