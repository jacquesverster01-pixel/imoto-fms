import { assembleChecklist } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'

const CADENCE_LAYERS = [
  { key: 'weekly',    label: '— Weekly questions —' },
  { key: 'monthly',   label: '— Monthly additions —' },
  { key: 'quarterly', label: '— Quarterly additions —' },
]

const LAYER_INCLUDED = {
  weekly:    ['weekly'],
  monthly:   ['weekly', 'monthly'],
  quarterly: ['weekly', 'monthly', 'quarterly'],
}

export default function InspectionPreviewModal({ isOpen, onClose, cadence, templates }) {
  if (!isOpen) return null

  const assembled = assembleChecklist(templates, cadence)
  const layers    = LAYER_INCLUDED[cadence] || ['weekly']

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 560, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...styles.modalTitle, margin: 0, textTransform: 'capitalize' }}>
            {cadence} Checklist Preview
          </h3>
          <span style={{ fontSize: 12, color: '#888' }}>{assembled.length} questions</span>
        </div>

        {layers.map(layer => {
          const qs = (templates?.[layer] || []).filter(q => q.active !== false)
          if (!qs.length) return null
          const divider = CADENCE_LAYERS.find(c => c.key === layer)
          return (
            <div key={layer} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase',
                letterSpacing: '0.06em', borderBottom: '1px solid #e4e6ea',
                paddingBottom: 6, marginBottom: 10,
              }}>
                {divider?.label}
              </div>
              {qs.map((q, i) => (
                <div key={q.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: 12, color: '#aaa', minWidth: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: '#1e1f3b' }}>{q.text}</span>
                    {q.requiresPhoto && (
                      <span style={{ fontSize: 11, color: '#6c63ff', marginLeft: 8 }}>📷</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button style={styles.btnSecondary} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
