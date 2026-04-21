import { useState } from 'react'
import InventoryStockOnHand from '../components/inventory/InventoryStockOnHand'
import InventoryProducts from '../components/inventory/InventoryProducts'
import InventoryBOM from '../components/inventory/InventoryBOM'
import InventoryAssemblies from '../components/inventory/InventoryAssemblies'
import InventoryImportedBOMs from '../components/inventory/InventoryImportedBOMs'

const TABS = [
  { id: 'stock',        label: 'Stock On Hand' },
  { id: 'products',     label: 'Products' },
  { id: 'bom',          label: 'Bill of Materials' },
  { id: 'assemblies',   label: 'Assemblies' },
  { id: 'importedboms', label: 'Imported BOMs' },
]

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('stock')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1d3b', margin: 0 }}>Inventory</h2>
        <p style={{ fontSize: 13, color: '#9298c4', margin: '4px 0 0' }}>
          Live stock positions, products and manufacturing BOMs via Unleashed
        </p>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #f0f2f5', marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? '#6c63ff' : '#9298c4',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid #6c63ff' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'stock'      && <InventoryStockOnHand />}
      {activeTab === 'products'   && <InventoryProducts />}
      {activeTab === 'bom'        && <InventoryBOM />}
      {activeTab === 'assemblies'   && <InventoryAssemblies />}
      {activeTab === 'importedboms' && <InventoryImportedBOMs />}
    </div>
  )
}
