// Shared inline styles for all HR tab components

export const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: 28, width: 380,
    display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
  },
  modalTitle: { fontWeight: 700, fontSize: 16, marginBottom: 16 },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  label: { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' },
  input: {
    width: '100%', padding: '8px 10px', border: '1px solid #e4e6ea',
    borderRadius: 8, fontSize: 13, marginBottom: 12,
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit'
  },
  btnPrimary: {
    background: '#6c63ff', color: '#fff', border: 'none',
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
  },
  btnSecondary: {
    background: '#fff', color: '#555', border: '1px solid #e4e6ea',
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer'
  },
  btnSmall: {
    padding: '5px 12px', borderRadius: 6, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', border: 'none'
  },
  card: {
    background: '#fff', border: '1px solid #e4e6ea',
    borderRadius: 12, padding: 20
  },
  cardTitle: { fontWeight: 700, fontSize: 15, color: '#1e1f3b' },
  empCard: {
    background: '#fff', border: '1px solid #e4e6ea',
    borderRadius: 12, padding: 16
  },
  th: {
    textAlign: 'left', padding: '10px 12px',
    fontSize: 11, fontWeight: 700, color: '#888',
    textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
  pill: {
    display: 'inline-block', padding: '2px 8px',
    borderRadius: 20, fontSize: 11, fontWeight: 600
  },
  statPill: {
    background: '#f0f2f5', color: '#555',
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600
  }
}
