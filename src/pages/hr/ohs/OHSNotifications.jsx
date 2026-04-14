import { styles } from '../../../utils/hrStyles'
import { ohsAlertSeverityStyle } from '../../../utils/ohs'

export default function OHSNotifications({ alerts }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 20 }}>
      <div style={{ ...styles.cardTitle, marginBottom: 16 }}>OHS Alerts</div>
      {alerts.length === 0 && (
        <div style={{ border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>No outstanding OHS alerts</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map(alert => {
          const sty = ohsAlertSeverityStyle(alert.severity)
          return (
            <div key={alert.key} style={{ border: `1px solid ${sty.border}`, borderLeft: `4px solid ${sty.border}`, borderRadius: 8, padding: '12px 16px', background: sty.bg }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{alert.severity === 'High' ? '⚠' : '🔔'}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: sty.text }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: sty.text, opacity: 0.8, marginTop: 2 }}>{alert.detail}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
