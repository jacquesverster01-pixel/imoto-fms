import { styles } from '../../../utils/hrStyles'
import { TEMPLATE_FIELDS } from './discTemplateData'

export default function DiscTemplatePanel({
  templatePanelOpen,
  selectedTemplate,
  guidance,
  guidanceOpen,
  setGuidanceOpen,
  panelText,
  setPanelText,
  templateFieldValues,
  handleFieldChange,
  remainingPlaceholders,
  applyPanelText,
  cancelPanel,
  onPrint,
}) {
  return (
    <>
      {templatePanelOpen && (
        <div style={{ width: 1, background: '#e4e6ea', flexShrink: 0 }} />
      )}

      <div style={{
        width: templatePanelOpen ? 639 : 0,
        flexShrink: 0,
        overflow: templatePanelOpen ? 'visible' : 'hidden',
        opacity: templatePanelOpen ? 1 : 0,
        transition: 'width 300ms ease, opacity 250ms ease',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        maxHeight: '90vh',
      }}>

        {/* Two-column body */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>

          {/* Left column: template content */}
          <div style={{ flex: '1 1 280px', minWidth: 260, overflowY: 'auto', padding: '24px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                  {selectedTemplate}
                </h4>
                <span style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 600, background: '#ede9fe', color: '#6c63ff',
                  borderRadius: 4, padding: '2px 7px', marginTop: 2, whiteSpace: 'nowrap',
                }}>SA LRA Schedule 8</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                Fill in the details below. The letter text updates automatically.
              </p>
            </div>

            {TEMPLATE_FIELDS[selectedTemplate] && TEMPLATE_FIELDS[selectedTemplate].length > 0 && (
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
                }}>
                  Fill in the details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TEMPLATE_FIELDS[selectedTemplate].map(field => (
                    <div key={field.key}>
                      <label style={{ ...styles.label, marginBottom: 3 }}>{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder}
                          value={templateFieldValues[field.key] || ''}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          style={{ ...styles.input, resize: 'vertical', marginBottom: 0 }}
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={templateFieldValues[field.key] || ''}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          style={{ ...styles.input, marginBottom: 0 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, marginBottom: 4 }}>
                  As you fill in the details above, the letter text updates automatically.
                </div>
                <div style={{ borderTop: '1px solid #e4e6ea', marginTop: 8 }} />
              </div>
            )}

            {templatePanelOpen && (
              remainingPlaceholders.length === 0 ? (
                <div style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 6,
                  background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                }}>
                  All fields complete — ready to print
                </div>
              ) : (
                <div style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 6,
                  background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d',
                }}>
                  Still unfilled: {remainingPlaceholders.join(', ')}
                </div>
              )
            )}

            <textarea
              style={{
                width: '100%', boxSizing: 'border-box',
                minHeight: 200, resize: 'vertical',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: 12.5, lineHeight: 1.7,
                border: '1px solid #d1d5db', borderRadius: 8,
                padding: '10px 12px', color: '#1e293b',
                outline: 'none', background: '#fafafa',
              }}
              value={panelText}
              onChange={e => setPanelText(e.target.value)}
            />
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Review the full text before printing or saving. Edit directly if needed.
            </div>
          </div>

          {/* Divider between columns */}
          {guidance && (
            <div style={{ width: 1, background: '#e4e6ea', flexShrink: 0 }} />
          )}

          {/* Right column: SA Labour Law Guidance */}
          {guidance && (
            <div style={{ flex: '0 0 280px', minWidth: 240, overflowY: 'auto', padding: '24px 20px 16px' }}>
              <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => setGuidanceOpen(o => !o)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#3730a3',
                  }}
                >
                  <span>SA Labour Law Guidance</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', transform: guidanceOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', display: 'inline-block' }}>▼</span>
                </button>
                {guidanceOpen && (
                  <div style={{ padding: '0 12px 12px' }}>
                    <ol style={{ margin: '0 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {guidance.steps.map((step, i) => (
                        <li key={i} style={{
                          fontSize: 12, color: '#374151', lineHeight: 1.6,
                          borderLeft: '3px solid #6c63ff', paddingLeft: 10,
                          listStyle: 'decimal', marginLeft: 0,
                        }}>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <div style={{ fontSize: 11, color: '#94a3b8', borderTop: '1px solid #e0e7ff', paddingTop: 8 }}>
                      Reference: {guidance.reference}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e4e6ea', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#fff', flexShrink: 0 }}>
          <button
            style={{
              padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: '#fff', border: '1px solid #6c63ff', color: '#6c63ff',
            }}
            onClick={onPrint}
          >
            Print Letter
          </button>
          <button style={styles.btnSecondary} onClick={cancelPanel}>Cancel</button>
          <button
            style={{ ...styles.btnPrimary, background: '#6c63ff', border: 'none' }}
            onClick={applyPanelText}
          >
            Use this text
          </button>
        </div>
      </div>
    </>
  )
}
