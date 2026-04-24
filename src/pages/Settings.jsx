/*
 * iMoto FMS — Component Size Rules
 * ─────────────────────────────────
 * Page shell:      max 150 lines
 * Tab component:   max 400 lines
 * Modal component: max 200 lines
 * Utility file:    pure functions only — no JSX, no hooks
 */
import { useState } from 'react'
import { useGet, apiFetch } from '../hooks/useApi'
import CompanySection from './settings/CompanySection'
import DepartmentsSection from './settings/DepartmentsSection'
import UsersSection from './settings/UsersSection'
import AlertRulesSection from './settings/AlertRulesSection'
import WhatsAppSection from './settings/WhatsAppSection'
import BackupSection from './settings/BackupSection'
import ShiftsSection from './settings/ShiftsSection'
import LeaveEditorSection from './settings/LeaveEditorSection'
import AutoClockOutSection from './settings/AutoClockOutSection'
import OvertimeSection from './settings/OvertimeSection'
import DeptCodesSettings from './settings/DeptCodesSettings'

const SECTIONS = ['Company details', 'Departments', 'Department Codes', 'Users & roles', 'Shift editor', 'Leave editor', 'Auto clock-out', 'Overtime', 'Alert rules', 'WhatsApp bot', 'Data & backup']

export default function Settings() {
  const [activeSection, setActiveSection] = useState('Company details')
  const { data: settings, loading, refetch } = useGet('/settings')

  async function handleSave(patch) {
    try {
      await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(patch) })
      refetch()
    } catch (err) {
      console.error('Save settings failed:', err)
    }
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '180px 1fr' }}>
      <div className="bg-white rounded-xl border p-2 self-start" style={{ borderColor: '#e4e6ea' }}>
        {SECTIONS.map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors block"
            style={{ background: activeSection === s ? '#6c63ff15' : 'transparent', color: activeSection === s ? '#6c63ff' : '#9298c4' }}
          >
            {s}
          </button>
        ))}
      </div>
      <div>
        {loading && !settings && <div style={{ color: '#b0b5cc', fontSize: 13, padding: 20 }}>Loading…</div>}
        {(!loading || settings) && activeSection === 'Company details' && <CompanySection settings={settings} onSaved={handleSave} />}
        {(!loading || settings) && activeSection === 'Departments' && <DepartmentsSection settings={settings} onSaved={handleSave} />}
        {activeSection === 'Department Codes' && <DeptCodesSettings />}
        {(!loading || settings) && activeSection === 'Users & roles' && <UsersSection settings={settings} onSaved={handleSave} />}
        {(!loading || settings) && activeSection === 'Shift editor' && <ShiftsSection settings={settings} onSaved={handleSave} />}
        {(!loading || settings) && activeSection === 'Leave editor' && <LeaveEditorSection settings={settings} onSaved={handleSave} />}
        {(!loading || settings) && activeSection === 'Auto clock-out' && <AutoClockOutSection settings={settings} onSaved={handleSave} />}
        {(!loading || settings) && activeSection === 'Overtime' && <OvertimeSection settings={settings} onSaved={handleSave} />}
        {(!loading || settings) && activeSection === 'Alert rules' && <AlertRulesSection settings={settings} onSaved={handleSave} />}
        {(!loading || settings) && activeSection === 'WhatsApp bot' && <WhatsAppSection settings={settings} onSaved={handleSave} />}
        {activeSection === 'Data & backup' && <BackupSection />}
      </div>
    </div>
  )
}
