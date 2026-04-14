import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { todayStr } from '../../../utils/time'
import { equipRiskColour, equipRiskLabel, serviceStatusColour, serviceStatusLabel } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'
import AddEquipmentModal from './AddEquipmentModal'
import LogServiceModal from './LogServiceModal'
import OHSFilePanel from './OHSFilePanel'

const UPLOADS_URL = 'http://localhost:3001/uploads'

const CATEGORIES = ['All','Power Tools','Hand Tools','Lifting Equipment','Pressure Vessels','Electrical Equipment','Welding Equipment','Material Handling','Safety Equipment','Other']
const STATUSES   = ['All','Active','Under Inspection','Out of Service','Decommissioned']

function isInspectionOverdue(equip) {
  if (!equip.nextInspectionDate || equip.status !== 'Active') return false
  return equip.nextInspectionDate < todayStr()
}

function statusStyle(status) {
  if (status === 'Active')           return { background: '#dcfce7', color: '#166534' }
  if (status === 'Out of Service')   return { background: '#fef2f2', color: '#991b1b' }
  if (status === 'Under Inspection') return { background: '#dbeafe', color: '#1e40af' }
  return { background: '#f3f4f6', color: '#374151' }
}

export default function EquipmentTab({ settingsData }) {
  const { data: equipRaw, refetch: refetchEquip } = useGet('/ohs-equipment')
  const equipment   = Array.isArray(equipRaw) ? equipRaw : []
  const departments = settingsData?.departments || []

  const [search,          setSearch]          = useState('')
  const [catFilter,       setCatFilter]       = useState('All')
  const [statusFilter,    setStatusFilter]    = useState('All')
  const [showAdd,         setShowAdd]         = useState(false)
  const [editItem,        setEditItem]        = useState(null)
  const [confirmDelete,   setConfirmDelete]   = useState(null)
  const [expandedHistory, setExpandedHistory] = useState({})
  const [logServiceItem,  setLogServiceItem]  = useState(null)

  const totalCount  = equipment.length
  const activeCount = equipment.filter(e => e.status === 'Active').length
  const dueCount    = equipment.filter(e => isInspectionOverdue(e)).length
  const oosCount    = equipment.filter(e => e.status === 'Out of Service').length

  const filtered = equipment.filter(e => {
    if (catFilter !== 'All' && e.category !== catFilter) return false
    if (statusFilter !== 'All' && e.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(
        (e.name     || '').toLowerCase().includes(q) ||
        (e.serial   || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q)
      )) return false
    }
    return true
  })

  function toggleHistory(id) {
    setExpandedHistory(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/ohs-equipment/${id}`, { method: 'DELETE' })
      refetchEquip()
    } catch (err) {
      console.error('Delete equipment failed:', err)
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(showAdd || editItem) && (
        <AddEquipmentModal
          equipment={editItem}
          departments={departments}
          onClose={() => { setShowAdd(false); setEditItem(null) }}
          onSaved={() => { setShowAdd(false); setEditItem(null); refetchEquip() }}
        />
      )}
      {logServiceItem && (
        <LogServiceModal
          equipment={logServiceItem}
          onClose={() => setLogServiceItem(null)}
          onSaved={() => { setLogServiceItem(null); refetchEquip() }}
        />
      )}
      {confirmDelete && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, width: 360 }}>
            <h3 style={styles.modalTitle}>Delete Equipment</h3>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
              Delete <strong>{confirmDelete.name}</strong>? This cannot be undone.
            </p>
            <div style={styles.modalBtns}>
              <button style={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={{ ...styles.btnPrimary, background: '#dc2626' }} onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total Equipment',    value: totalCount },
          { label: 'Active',             value: activeCount },
          { label: 'Due for Inspection', value: dueCount,  accent: dueCount > 0 ? '#dc2626' : undefined },
          { label: 'Out of Service',     value: oosCount,  accent: oosCount > 0 ? '#f97316' : undefined },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{ flex: 1, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: accent || '#6c63ff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
            <input
              style={{ ...styles.input, marginBottom: 0, width: 220 }}
              placeholder="Search name, serial, location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={{ ...styles.input, marginBottom: 0, width: 190 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select style={{ ...styles.input, marginBottom: 0, width: 170 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button style={styles.btnPrimary} onClick={() => setShowAdd(true)}>+ Add Equipment</button>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '32px 0', fontSize: 14 }}>No equipment found</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(item => {
            const riskCol   = equipRiskColour(item.riskLevel)
            const overdue   = isInspectionOverdue(item)
            const svcCol    = serviceStatusColour(item.nextServiceDate)
            const svcLabel  = serviceStatusLabel(item.nextServiceDate)
            const history   = item.serviceHistory || []
            return (
              <div key={item.id} style={{ border: `1px solid ${overdue ? '#fca5a5' : '#e4e6ea'}`, borderRadius: 10, padding: '14px 16px', background: overdue ? '#fff5f5' : '#fafafa' }}>
                {overdue && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>⚠ Inspection overdue</div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b' }}>{item.name}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f0f2f5', color: '#555' }}>{item.category}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, ...riskCol }}>{equipRiskLabel(item.riskLevel)}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, ...statusStyle(item.status) }}>{item.status}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: svcCol.bg, color: svcCol.text }}>{svcLabel}</span>
                      {item.preUseCheckRequired && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>Pre-use check required</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                      {item.serial     && <span>S/N: {item.serial}</span>}
                      {item.location   && <span>📍 {item.location}</span>}
                      {item.department && <span>{item.department}</span>}
                      {item.lastInspectionDate && <span>Last insp: {item.lastInspectionDate}</span>}
                      {item.nextInspectionDate && (
                        <span style={{ color: overdue ? '#dc2626' : 'inherit' }}>Next insp: {item.nextInspectionDate}</span>
                      )}
                      {item.serviceStickerPhoto && (
                        <img
                          src={`${UPLOADS_URL}/${item.serviceStickerPhoto.file}`}
                          alt="Service sticker"
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #e4e6ea' }}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555' }} onClick={() => setEditItem(item)}>Edit</button>
                    <button style={{ ...styles.btnSmall, background: '#e0f2fe', color: '#0369a1' }} onClick={() => toggleHistory(item.id)}>
                      {expandedHistory[item.id] ? 'Hide History' : 'View History'}
                    </button>
                    <button style={{ ...styles.btnSmall, background: '#ede9fe', color: '#5b21b6' }} onClick={() => setLogServiceItem(item)}>Log Service</button>
                    <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#991b1b' }} onClick={() => setConfirmDelete(item)}>Delete</button>
                  </div>
                </div>

                {expandedHistory[item.id] && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #e4e6ea', paddingTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Service History</div>
                    {history.length === 0 && (
                      <div style={{ fontSize: 12, color: '#aaa' }}>No service history yet.</div>
                    )}
                    {history.map(sh => (
                      <div key={sh.id} style={{ fontSize: 12, color: '#444', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <strong>{sh.serviceDate || sh.date?.slice(0, 10)}</strong>
                        {sh.technician && <span style={{ color: '#666' }}> — {sh.technician}</span>}
                        {sh.notes      && <span style={{ color: '#888' }}> — {sh.notes}</span>}
                        {sh.nextServiceDate && <span style={{ color: '#6c63ff', marginLeft: 6 }}>(Next: {sh.nextServiceDate})</span>}
                      </div>
                    ))}
                  </div>
                )}
                <OHSFilePanel context="equipment" contextId={item.id} uploadedBy="" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
