import { useMemo } from 'react'
import { applyFilters } from './bomUtils'
import BomCostSummary from './BomCostSummary'
import BomToolbar from './BomToolbar'
import BomTreeView from './BomTreeView'
import BomTableView from './BomTableView'

export default function BomViewer({
  bom, items, search, setSearch, deptFilter, setDeptFilter,
  hideLabour, setHideLabour, viewMode, setViewMode,
  deleteConfirm, setDeleteConfirm, onDelete,
}) {
  const filteredItems = useMemo(
    () => applyFilters(items, { search, deptFilter, hideLabour }),
    [items, search, deptFilter, hideLabour]
  )

  return (
    <div style={{ flex: 1, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      <BomCostSummary bom={bom} items={items} />
      <BomToolbar
        bom={bom}
        filteredItems={filteredItems}
        search={search} setSearch={setSearch}
        deptFilter={deptFilter} setDeptFilter={setDeptFilter}
        hideLabour={hideLabour} setHideLabour={setHideLabour}
        viewMode={viewMode} setViewMode={setViewMode}
        deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}
        onDelete={onDelete}
      />
      {viewMode === 'tree' ? (
        <BomTreeView
          items={items}
          search={search}
          deptFilter={deptFilter}
          hideLabour={hideLabour}
        />
      ) : (
        <BomTableView
          items={items}
          search={search}
          deptFilter={deptFilter}
          hideLabour={hideLabour}
        />
      )}
    </div>
  )
}
