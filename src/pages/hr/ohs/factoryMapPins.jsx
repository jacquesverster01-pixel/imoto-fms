// factoryMapPins.jsx — AssetPin + popup
import { todayStr } from '../../../utils/time'

export const TYPE_COLOURS = {
  fire_extinguisher: '#ef4444',
  hose_reel:         '#ef4444',
  first_aid:         '#22c55e',
  emergency_exit:    '#84cc16',
  assembly_point:    '#22c55e',
  electrical_panel:  '#eab308',
  eyewash:           '#06b6d4',
}

export const TYPE_LABELS = {
  fire_extinguisher: 'Fire Extinguisher',
  hose_reel:         'Hose Reel',
  first_aid:         'First Aid',
  emergency_exit:    'Emergency Exit',
  assembly_point:    'Assembly Point',
  electrical_panel:  'Electrical Panel',
  eyewash:           'Eyewash',
}

function renderIcon(type) {
  switch (type) {

    case 'fire_extinguisher': return (
      <>
        <circle cx="16" cy="16" r="12" fill="white"/>
        {/* Cylinder body */}
        <rect x="13" y="10" width="9" height="16" rx="4.5" fill="#ef4444"/>
        {/* Neck/shoulder */}
        <rect x="15" y="7" width="5" height="4" rx="1" fill="#ef4444"/>
        {/* Carry handle arch */}
        <path d="M 14.5 8 Q 17.5 5 20.5 8" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
        {/* Discharge horn curving from shoulder top-right */}
        <path d="M 20 8 C 23 7 24 5.5 24 10" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Hose hanging from left side of body */}
        <path d="M 13 16 C 9 14 8 18 8 22" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
        {/* Nozzle at hose end */}
        <line x1="8" y1="22" x2="7" y2="25" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      </>
    )

    case 'hose_reel': return (
      <>
        <circle cx="16" cy="16" r="12" fill="white"/>
        {/* Spiral from outer-left inward: alternating CW/CCW semicircles, decreasing radius */}
        <path
          d="M 10 16 a 6.5 6.5 0 0 1 13 0 a 5.5 5.5 0 0 0 -11 0 a 4.5 4.5 0 0 1 9 0 a 3.5 3.5 0 0 0 -7 0 a 2.5 2.5 0 0 1 5 0 a 1.5 1.5 0 0 0 -3 0"
          fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
        {/* Nozzle/connector at outer end of spiral */}
        <rect x="4" y="14.5" width="5.5" height="3" rx="1" fill="#ef4444"/>
      </>
    )

    case 'first_aid': return (
      <>
        <rect x="3" y="3" width="26" height="26" rx="3" fill="#22c55e"/>
        {/* White cross — equal arms */}
        <rect x="14" y="7"  width="4" height="18" rx="1" fill="white"/>
        <rect x="7"  y="14" width="18" height="4"  rx="1" fill="white"/>
      </>
    )

    case 'emergency_exit': return (
      <>
        <circle cx="16" cy="16" r="12" fill="white"/>
        <text x="16" y="16" textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fontWeight="900" fill="#ef4444"
          fontFamily="Arial,Helvetica,sans-serif">EXIT</text>
      </>
    )

    case 'assembly_point': return (
      <>
        <rect x="3" y="3" width="26" height="26" rx="2" fill="#22c55e"/>
        {/* 4 diagonal white arrows pointing inward from each corner */}
        {/* NW → SE (tip at ~12,12) */}
        <polygon points="5,8 8,5 12,12" fill="white"/>
        {/* NE → SW (tip at ~20,12) */}
        <polygon points="27,8 24,5 20,12" fill="white"/>
        {/* SW → NE (tip at ~12,20) */}
        <polygon points="5,24 8,27 12,20" fill="white"/>
        {/* SE → NW (tip at ~20,20) */}
        <polygon points="27,24 24,27 20,20" fill="white"/>
        {/* 2 simplified white person silhouettes in centre */}
        <circle cx="13" cy="15" r="1.8" fill="white"/>
        <rect x="11.5" y="17" width="3" height="5" rx="1.5" fill="white"/>
        <circle cx="19" cy="15" r="1.8" fill="white"/>
        <rect x="17.5" y="17" width="3" height="5" rx="1.5" fill="white"/>
      </>
    )

    case 'electrical_panel': return (
      <>
        {/* Yellow equilateral triangle with thick black border */}
        <polygon points="16,3 29,27 3,27" fill="#eab308" stroke="black" strokeWidth="2" strokeLinejoin="round"/>
        {/* Black lightning bolt centred, tip pointing downward */}
        <polygon points="18,8 13,18 17,18 12,27 19,16 15,16" fill="black"/>
      </>
    )

    case 'eyewash': return (
      <>
        <circle cx="16" cy="16" r="12" fill="#06b6d4"/>
        {/* White eye — almond/oval outline */}
        <path d="M 6 14 Q 16 7 26 14 Q 16 21 6 14 Z" fill="none" stroke="white" strokeWidth="2"/>
        {/* Iris ring */}
        <circle cx="16" cy="14" r="3.5" fill="none" stroke="white" strokeWidth="1.5"/>
        {/* Pupil */}
        <circle cx="16" cy="14" r="1.5" fill="white"/>
        {/* Two water drop shapes below */}
        <path d="M 12 21 Q 10.5 24.5 12.5 26 Q 14.5 24.5 12 21 Z" fill="white"/>
        <path d="M 20 21 Q 18.5 24.5 20.5 26 Q 22.5 24.5 20 21 Z" fill="white"/>
      </>
    )

    default: return <circle cx="16" cy="16" r="10" fill="#6b7280"/>
  }
}

function ringColour(nextService) {
  if (!nextService) return '#9ca3af'
  const today = todayStr()
  const days = Math.floor((new Date(nextService + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 86400000)
  if (days < 0)   return '#ef4444'
  if (days <= 30) return '#f97316'
  return '#22c55e'
}

export function AssetPin({ asset, editMode, containerRef, onDragStart, onSelect, onDelete }) {
  if (asset.xPct == null || asset.yPct == null) return null
  const ring = ringColour(asset.nextService)
  return (
    <div ref={containerRef}
      style={{ position: 'absolute', left: `calc(${asset.xPct * 100}% - 16px)`, top: `calc(${asset.yPct * 100}% - 16px)`, width: 32, height: 32, zIndex: 8, userSelect: 'none', cursor: editMode ? 'move' : 'pointer' }}
      onMouseDown={editMode ? e => onDragStart(e, asset) : undefined}
      onClick={!editMode ? e => { e.stopPropagation(); onSelect(asset) } : undefined}
    >
      <svg width="32" height="32" style={{ display: 'block' }}>
        {renderIcon(asset.type)}
        <circle cx="16" cy="16" r="14" fill="none" stroke={ring} strokeWidth="2.5"/>
      </svg>
      {editMode && (
        <div onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(asset) }}
          style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #fff', color: '#fff', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9, lineHeight: 1 }}>✕</div>
      )}
    </div>
  )
}

export function AssetPinPopup({ asset, zones, onClose }) {
  if (!asset) return null
  const zoneName = zones?.find(z => z.id === asset.zoneId)?.name || 'Unassigned'
  const leftStyle = asset.xPct > 0.75
    ? `calc(${asset.xPct * 100}% - 224px)`
    : `calc(${asset.xPct * 100}% + 18px)`
  return (
    <div onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
      style={{ position: 'absolute', left: leftStyle, top: `calc(${asset.yPct * 100}% - 20px)`, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 8, padding: '10px 12px', zIndex: 10, minWidth: 180, maxWidth: 230, boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{asset.label}</div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Type: {TYPE_LABELS[asset.type] || asset.type}</div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Zone: {zoneName}</div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Last serviced: {asset.lastServiced || '—'}</div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Next service: {asset.nextService || '—'}</div>
      {asset.stockLevel && <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Stock: {asset.stockLevel}</div>}
      <button onClick={onClose} style={{ marginTop: 6, fontSize: 11, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Close</button>
    </div>
  )
}
