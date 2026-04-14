/*
 * iMoto FMS — Component Size Rules
 * ─────────────────────────────────
 * Page shell:      max 150 lines  — imports + shared state + tab switcher only
 * Tab component:   max 400 lines  — if exceeded, split modals into separate files
 * Modal component: max 200 lines  — one modal = one file
 * Utility file:    pure functions only — no JSX, no hooks
 *
 * Shared time helpers  → src/utils/time.js
 * OHS helpers          → src/utils/ohs.js
 * API hook + apiFetch  → src/hooks/useApi.js
 *
 * apiFetch() paths NEVER include /api prefix.
 * All timestamps use UTC+2 hardcoded offset — never Intl or toLocaleTimeString.
 * All useState at top of component — never inside conditions or loops.
 * All helper functions at module level — never inside component bodies.
 * No IIFEs in JSX — use {condition && <JSX />} pattern.
 */
import { useState, useEffect } from 'react'
import { useGet } from '../hooks/useApi'
import { styles } from '../utils/hrStyles'
import ClockInTab     from './hr/ClockInTab'
import TimeLogTab     from './hr/TimeLogTab'
import BiometricTab   from './hr/BiometricTab'
import EmployeesTab   from './hr/EmployeesTab'
import LeaveTab       from './hr/LeaveTab'
import DisciplinaryTab from './hr/DisciplinaryTab'
import OHSTab         from './hr/OHSTab'

const SECTION_TABS = {
  'time-attendance':  ['Clock-in', 'Time log', 'Biometric'],
  'employees':        ['Employees'],
  'leave-management': ['Leave management'],
  'disciplinary':     ['Disciplinary'],
  'health-safety':    ['Health & Safety'],
}

export default function HR({ section = 'time-attendance' }) {
  const tabs = SECTION_TABS[section] || SECTION_TABS['time-attendance']
  const [activeTab, setActiveTab] = useState(tabs[0])

  useEffect(() => {
    setActiveTab((SECTION_TABS[section] || SECTION_TABS['time-attendance'])[0])
  }, [section])

  const { data: empData, refetch: refreshEmployees } = useGet('/employees')
  const { data: settingsData } = useGet('/settings')
  const employees = empData?.employees || []

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: tabs.length > 1 ? 'flex' : 'none', gap: 4, marginBottom: 24, borderBottom: '2px solid #e4e6ea', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === tab ? '#6c63ff' : '#888',
              borderBottom: activeTab === tab ? '2px solid #6c63ff' : '2px solid transparent',
              marginBottom: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {tab === 'Biometric' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
                <path d="M2 12a10 10 0 0 1 18-6"/>
                <path d="M2 17.5a14.5 14.5 0 0 0 4.27 6"/>
                <path d="M22 12a10 10 0 0 1-1.18 4.6"/>
                <path d="M5 19.5C5.81 21 7 22 9 22"/>
                <path d="M6 12a6 6 0 0 1 11.17-3"/>
              </svg>
            )}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={styles.card}>
        {activeTab === 'Clock-in' && (
          <ClockInTab employees={employees} settingsData={settingsData} />
        )}
        {activeTab === 'Time log' && (
          <TimeLogTab employees={employees} />
        )}
        {activeTab === 'Biometric' && (
          <BiometricTab employees={employees} refetchEmployees={refreshEmployees} />
        )}
        {activeTab === 'Employees' && (
          <EmployeesTab employees={employees} settingsData={settingsData} refetchEmployees={refreshEmployees} />
        )}
        {activeTab === 'Leave management' && (
          <LeaveTab employees={employees} settingsData={settingsData} />
        )}
        {activeTab === 'Health & Safety' && <OHSTab employees={employees} settingsData={settingsData} />}
        {activeTab === 'Disciplinary' && <DisciplinaryTab employees={employees} />}
      </div>
    </div>
  )
}
