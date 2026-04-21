import { describe, test, expect } from '@jest/globals'
import { parseBomCsv } from '../routes/boms.js'
import { applyFilters, computeCosts, getVisibleAncestors, buildParentMap } from '../src/components/inventory/bom/bomUtils.js'

// ─── parseBomCsv ─────────────────────────────────────────────────────────────

describe('parseBomCsv', () => {
  const HEADER = 'BOM_Reference,Product_Code,Product_Description,Level,Item_Code,Item_Description,Parent_Code,Department,Item_Type,Unit,Quantity,Wastage_Qty,Unit_Cost,Total_Cost'

  test('parses a valid single-row CSV', () => {
    const csv = `${HEADER}\nBOM-001,PROD-A,My Product,0,SUBA001,Sub Assembly,,MEC,Assembly,EA,1,0,0,0`
    const rows = parseBomCsv(Buffer.from(csv))
    expect(rows).toHaveLength(1)
    expect(rows[0].itemCode).toBe('SUBA001')
    expect(rows[0].level).toBe(0)
    expect(rows[0].itemType).toBe('Assembly')
  })

  test('throws on empty CSV', () => {
    expect(() => parseBomCsv(Buffer.from(''))).toThrow()
  })

  test('throws when required column is missing', () => {
    const badCsv = 'BOM_Reference,Product_Code\nBOM-001,PROD-A'
    expect(() => parseBomCsv(Buffer.from(badCsv))).toThrow(/Missing columns/)
  })
})

// ─── applyFilters ─────────────────────────────────────────────────────────────

const ITEMS = [
  { itemCode: 'SUBA001', itemDescription: 'Main Frame', department: 'MEC', itemType: 'Assembly', parentCode: '' },
  { itemCode: 'PART-001', itemDescription: 'Steel Plate', department: 'MEC', itemType: 'Part', parentCode: 'SUBA001' },
  { itemCode: 'PART-002', itemDescription: 'Wire Bundle', department: 'ELE', itemType: 'Part', parentCode: 'SUBA001' },
  { itemCode: 'TEAM-01', itemDescription: 'Labour Hour', department: 'LAB', itemType: 'Part', parentCode: 'SUBA001' },
]

describe('applyFilters', () => {
  test('hideLabour removes TEAM- items', () => {
    const result = applyFilters(ITEMS, { search: '', deptFilter: '', hideLabour: true })
    expect(result.find(i => i.itemCode === 'TEAM-01')).toBeUndefined()
    expect(result).toHaveLength(3)
  })

  test('deptFilter narrows to matching department', () => {
    const result = applyFilters(ITEMS, { search: '', deptFilter: 'ELE', hideLabour: false })
    expect(result).toHaveLength(1)
    expect(result[0].itemCode).toBe('PART-002')
  })

  test('search matches itemCode', () => {
    const result = applyFilters(ITEMS, { search: 'PART-001', deptFilter: '', hideLabour: false })
    expect(result).toHaveLength(1)
    expect(result[0].itemCode).toBe('PART-001')
  })

  test('search matches itemDescription case-insensitively', () => {
    const result = applyFilters(ITEMS, { search: 'steel', deptFilter: '', hideLabour: false })
    expect(result).toHaveLength(1)
    expect(result[0].itemCode).toBe('PART-001')
  })
})

// ─── computeCosts ─────────────────────────────────────────────────────────────

describe('computeCosts', () => {
  const COST_ITEMS = [
    { itemCode: 'A1', itemType: 'Assembly', department: 'MEC', totalCost: 0 },
    { itemCode: 'P1', itemType: 'Part', department: 'MEC', totalCost: 100 },
    { itemCode: 'P2', itemType: 'Part', department: 'ELE', totalCost: 200 },
    { itemCode: 'P3', itemType: 'Part', department: 'MEC', totalCost: 50 },
  ]

  test('total sums only Part rows', () => {
    const { total } = computeCosts(COST_ITEMS)
    expect(total).toBe(350)
  })

  test('byDept groups and sorts descending', () => {
    const { byDept } = computeCosts(COST_ITEMS)
    expect(byDept[0].dept).toBe('ELE')
    expect(byDept[1].dept).toBe('MEC')
    expect(byDept[1].total).toBe(150)
  })
})

// ─── getVisibleAncestors ──────────────────────────────────────────────────────

describe('getVisibleAncestors', () => {
  const TREE_ITEMS = [
    { itemCode: 'ROOT', parentCode: '' },
    { itemCode: 'MID',  parentCode: 'ROOT' },
    { itemCode: 'LEAF', parentCode: 'MID' },
  ]

  test('returns full ancestor chain for a deep match', () => {
    const parentMap = buildParentMap(TREE_ITEMS)
    const ancestors = getVisibleAncestors(new Set(['LEAF']), parentMap)
    expect(ancestors.has('MID')).toBe(true)
    expect(ancestors.has('ROOT')).toBe(true)
  })

  test('returns empty set when no matching codes', () => {
    const parentMap = buildParentMap(TREE_ITEMS)
    const ancestors = getVisibleAncestors(new Set(), parentMap)
    expect(ancestors.size).toBe(0)
  })
})
