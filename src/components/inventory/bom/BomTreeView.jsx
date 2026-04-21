import { useState, useMemo } from 'react'
import { buildChildrenMap, buildParentMap, getVisibleAncestors, applyFilters } from './bomUtils'

function TreeNode({ item, childrenMap, depth, expandedCodes, setExpandedCodes, matchSet, ancestorSet, hasFilter }) {
  const children = childrenMap.get(item.itemCode) || []
  const hasChildren = children.length > 0
  const isExpanded = expandedCodes.has(item.itemCode)
  const isMatch = matchSet.has(item.itemCode)
  const isAncestorOnly = !isMatch && ancestorSet.has(item.itemCode)
  const dimmed = hasFilter && !isMatch && !isAncestorOnly

  function toggle() {
    setExpandedCodes(prev => {
      const next = new Set(prev)
      if (next.has(item.itemCode)) next.delete(item.itemCode)
      else next.add(item.itemCode)
      return next
    })
  }

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', paddingLeft: depth * 20 + 8,
          paddingTop: 4, paddingBottom: 4, paddingRight: 8,
          opacity: dimmed ? 0.35 : 1,
          borderBottom: '1px solid #f8f9fb',
        }}
      >
        <span
          onClick={hasChildren ? toggle : undefined}
          style={{
            width: 16, flexShrink: 0, fontSize: 10, color: '#9298c4',
            cursor: hasChildren ? 'pointer' : 'default', userSelect: 'none',
          }}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>

        <span style={{
          fontSize: 12, fontFamily: 'monospace',
          color: item.level === 0 ? '#6c63ff' : item.itemType === 'Assembly' ? '#1a1d3b' : '#555',
          fontWeight: item.itemType === 'Assembly' ? 600 : 400,
          marginRight: 8, flexShrink: 0,
        }}>
          {item.itemCode}
        </span>

        <span style={{ fontSize: 12, color: '#444', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.itemDescription}
        </span>

        {item.itemType === 'Part' && (
          <span style={{ fontSize: 11, color: '#888', flexShrink: 0, marginLeft: 12, whiteSpace: 'nowrap' }}>
            {item.quantity} {item.unit} · R{item.totalCost.toFixed(2)}
          </span>
        )}

        <span style={{
          marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 10,
          background: item.itemType === 'Assembly' ? '#eff6ff' : '#f0fdf4',
          color: item.itemType === 'Assembly' ? '#3b82f6' : '#16a34a',
          flexShrink: 0,
        }}>
          {item.itemType}
        </span>
      </div>

      {hasChildren && isExpanded && children.map(child => (
        <TreeNode
          key={child.itemCode}
          item={child}
          childrenMap={childrenMap}
          depth={depth + 1}
          expandedCodes={expandedCodes}
          setExpandedCodes={setExpandedCodes}
          matchSet={matchSet}
          ancestorSet={ancestorSet}
          hasFilter={hasFilter}
        />
      ))}
    </div>
  )
}

export default function BomTreeView({ items, search, deptFilter, hideLabour }) {
  const [expandedCodes, setExpandedCodes] = useState(new Set())

  const childrenMap = useMemo(() => buildChildrenMap(items), [items])
  const parentMap   = useMemo(() => buildParentMap(items), [items])

  const hasFilter = !!(search || deptFilter || hideLabour)

  const filteredItems = useMemo(
    () => applyFilters(items, { search, deptFilter, hideLabour }),
    [items, search, deptFilter, hideLabour]
  )

  const matchSet = useMemo(() => new Set(filteredItems.map(i => i.itemCode)), [filteredItems])
  const ancestorSet = useMemo(() => getVisibleAncestors(matchSet, parentMap), [matchSet, parentMap])

  const visibleCodes = useMemo(() => new Set([...matchSet, ...ancestorSet]), [matchSet, ancestorSet])

  const autoExpanded = useMemo(() => {
    if (!hasFilter) return new Set()
    return new Set(ancestorSet)
  }, [ancestorSet, hasFilter])

  const effectiveExpanded = hasFilter
    ? new Set([...expandedCodes, ...autoExpanded])
    : expandedCodes

  const roots = useMemo(
    () => items.filter(i => !i.parentCode || i.parentCode === ''),
    [items]
  )

  const visibleRoots = hasFilter
    ? roots.filter(r => visibleCodes.has(r.itemCode))
    : roots

  if (visibleRoots.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0b5cc', fontSize: 13 }}>
        No items match your filter
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', fontSize: 13 }}>
      {visibleRoots.map(root => (
        <TreeNode
          key={root.itemCode}
          item={root}
          childrenMap={childrenMap}
          depth={0}
          expandedCodes={effectiveExpanded}
          setExpandedCodes={setExpandedCodes}
          matchSet={matchSet}
          ancestorSet={ancestorSet}
          hasFilter={hasFilter}
        />
      ))}
    </div>
  )
}
