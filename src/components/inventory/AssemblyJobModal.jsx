import { useState, useEffect } from 'react';
import { apiFetch } from '../../hooks/useApi';

function fmtZAR(n) {
  return 'R ' + (n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOnHand(stockMap, code) {
  return Object.prototype.hasOwnProperty.call(stockMap, code) ? stockMap[code] : null;
}

function calcSummary(components, stockMap) {
  let totalCost = 0;
  let procureCost = 0;
  let shortCount = 0;
  for (const c of components) {
    totalCost += c.totalCost ?? 0;
    const onHand = getOnHand(stockMap, c.componentCode);
    if (onHand !== null && onHand < c.qty) {
      const needed = c.qty - onHand;
      procureCost += needed * (c.unitCost ?? 0);
      shortCount++;
    }
  }
  return { totalCost, procureCost, shortCount };
}

export default function AssemblyJobModal({ item, components, onClose, onCreated }) {
  const [jobName, setJobName] = useState(item.name || item.ProductDescription || '');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [stockMap, setStockMap] = useState({});
  const [nameMap, setNameMap] = useState({});
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    apiFetch('/stock')
      .then(items => {
        const qtyMap = {};
        const nMap = {};
        for (const s of (Array.isArray(items) ? items : [])) {
          if (s.code != null) {
            qtyMap[s.code] = s.qty ?? 0;
            nMap[s.code] = s.name || '';
          }
        }
        setStockMap(qtyMap);
        setNameMap(nMap);
      })
      .catch(() => {})
      .finally(() => setLoadingStock(false));
  }, []);

  async function handleCreate() {
    if (!jobName.trim()) { setError('Job name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const tasks = components.map((c, i) => ({
        id: `task-${c.componentCode}-${Date.now()}-${i}`,
        name: c.componentCode,
        done: false,
        pct: 0,
        assignedTo: null,
        dependsOn: [],
        children: [],
        components: [{
          itemCode: c.componentCode,
          itemDescription: c.componentCode,
          quantity: c.qty,
          wastageQty: c.wastageQty ?? 0,
          unitCost: c.unitCost ?? 0,
          totalCost: c.totalCost ?? 0,
        }]
      }));
      await apiFetch('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobName.trim(),
          status: 'planned',
          colour: '#6366f1',
          dueDate: dueDate || null,
          tasks,
        })
      });
      onCreated();
    } catch (e) {
      setError(e.message || 'Failed to create job');
      setSaving(false);
    }
  }

  const { totalCost, procureCost, shortCount } = calcSummary(components, stockMap);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Job</h2>
          <p className="text-sm text-gray-500 mt-0.5">{item.ProductCode} — {item.ProductDescription}</p>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={jobName}
              onChange={e => setJobName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              BOM Components <span className="text-gray-400 font-normal">({components.length} items)</span>
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Code</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">On Hand</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Unit Cost</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {components.map((c, i) => {
                      const onHand = getOnHand(stockMap, c.componentCode);
                      const isShort = onHand !== null && onHand < c.qty;
                      return (
                        <tr key={i} className={isShort ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-1.5 font-mono text-gray-700">{c.componentCode}</td>
                          <td className="px-3 py-1.5 text-gray-600 truncate max-w-[200px]" title={nameMap[c.componentCode] || ''}>
                            {nameMap[c.componentCode] || <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-600">{c.qty}</td>
                          <td className="px-3 py-1.5 text-right">
                            {loadingStock
                              ? <span className="text-gray-300">…</span>
                              : onHand === null
                                ? <span className="text-gray-400">—</span>
                                : isShort
                                  ? <span className="text-amber-600 font-medium">⚠ {onHand}</span>
                                  : <span className="text-green-600 font-medium">{onHand}</span>
                            }
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-500">{fmtZAR(c.unitCost)}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700 font-medium">{fmtZAR(c.totalCost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-2 border-t border-gray-200 pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total BOM cost</span>
                <span className="font-semibold text-gray-800">{fmtZAR(totalCost)}</span>
              </div>
              {shortCount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Items to procure</span>
                  <span className="text-amber-700 font-semibold">{shortCount} item{shortCount > 1 ? 's' : ''}  {fmtZAR(procureCost)}</span>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
