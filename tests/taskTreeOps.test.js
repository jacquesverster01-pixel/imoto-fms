import { describe, test, expect } from '@jest/globals'
import {
  findNodeById, findParentId, updateNodeById, removeNodeById,
  appendChildTo, moveNodeTo, flattenTree, walkTree, filterVisibleRows
} from '../src/pages/production/taskTreeOps.js'

// Fixture: 2 roots. R1 has children C1 and C2. C1 has grandchild G1.
const G1 = { id: 'g1', name: 'Grandchild 1', children: [] }
const C1 = { id: 'c1', name: 'Child 1', children: [G1] }
const C2 = { id: 'c2', name: 'Child 2', children: [] }
const R1 = { id: 'r1', name: 'Root 1', children: [C1, C2] }
const R2 = { id: 'r2', name: 'Root 2', children: [] }
const TREE = [R1, R2]

describe('findNodeById', () => {
  test('finds at root', () => {
    expect(findNodeById(TREE, 'r1')).toBe(R1)
  })
  test('finds at depth 3', () => {
    expect(findNodeById(TREE, 'g1')).toBe(G1)
  })
  test('returns null when not found', () => {
    expect(findNodeById(TREE, 'nope')).toBeNull()
  })
})

describe('findParentId', () => {
  test('returns null for root-level node', () => {
    expect(findParentId(TREE, 'r1')).toBeNull()
  })
  test('returns parent id for nested node', () => {
    expect(findParentId(TREE, 'g1')).toBe('c1')
  })
})

describe('updateNodeById', () => {
  test('updater called on matched node', () => {
    const result = updateNodeById(TREE, 'g1', n => ({ ...n, name: 'Updated' }))
    expect(findNodeById(result, 'g1').name).toBe('Updated')
  })
  test('unrelated subtrees return same reference', () => {
    const result = updateNodeById(TREE, 'g1', n => ({ ...n, name: 'Updated' }))
    expect(result[1]).toBe(R2)
  })
  test('updates at depth 3 — path cloned, unchanged siblings same ref', () => {
    const result = updateNodeById(TREE, 'g1', n => ({ ...n, name: 'Deep' }))
    expect(result[0]).not.toBe(R1)
    expect(result[0].children[0]).not.toBe(C1)
    expect(result[0].children[1]).toBe(C2)
  })
})

describe('removeNodeById', () => {
  test('removes top-level task', () => {
    const result = removeNodeById(TREE, 'r2')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })
  test('removes deep descendant', () => {
    const result = removeNodeById(TREE, 'g1')
    expect(findNodeById(result, 'g1')).toBeNull()
    expect(findNodeById(result, 'c1')).not.toBeNull()
  })
  test('no-op when id not present — returns same reference', () => {
    expect(removeNodeById(TREE, 'missing')).toBe(TREE)
  })
})

describe('appendChildTo', () => {
  const NEW = { id: 'new', children: [] }
  test('appends at root when parentId is null', () => {
    const result = appendChildTo(TREE, null, NEW)
    expect(result).toHaveLength(3)
    expect(result[2]).toBe(NEW)
  })
  test('appends at a nested node', () => {
    const result = appendChildTo(TREE, 'c1', NEW)
    expect(findNodeById(result, 'c1').children).toHaveLength(2)
    expect(findNodeById(result, 'c1').children[1]).toBe(NEW)
  })
})

describe('moveNodeTo', () => {
  test('valid move — depth-1 node under another depth-0 sibling', () => {
    const result = moveNodeTo(TREE, 'c2', 'r2')
    expect(findNodeById(result, 'r2').children.some(c => c.id === 'c2')).toBe(true)
    expect(findNodeById(result, 'r1').children.some(c => c.id === 'c2')).toBe(false)
  })
  test('rejected move — node into its own descendant (cycle guard)', () => {
    expect(moveNodeTo(TREE, 'r1', 'g1')).toBe(TREE)
  })
  test('no-op move — node to its current parent stays in tree', () => {
    const result = moveNodeTo(TREE, 'c2', 'r1')
    expect(findNodeById(result, 'r1').children.some(c => c.id === 'c2')).toBe(true)
  })
})

describe('flattenTree', () => {
  test('returns every node in pre-order, roots included', () => {
    expect(flattenTree(TREE).map(n => n.id)).toEqual(['r1', 'c1', 'g1', 'c2', 'r2'])
  })
})

describe('walkTree', () => {
  test('visits every node with correct (node, depth, parentId) tuples', () => {
    const visits = []
    walkTree(TREE, (node, depth, parentId) => visits.push({ id: node.id, depth, parentId }))
    expect(visits).toEqual([
      { id: 'r1', depth: 0, parentId: null },
      { id: 'c1', depth: 1, parentId: 'r1' },
      { id: 'g1', depth: 2, parentId: 'c1' },
      { id: 'c2', depth: 1, parentId: 'r1' },
      { id: 'r2', depth: 0, parentId: null },
    ])
  })
})

describe('filterVisibleRows', () => {
  const FLAT = [
    { task: { id: 'r1' }, depth: 0, isParent: true },
    { task: { id: 'c1' }, depth: 1, isParent: true },
    { task: { id: 'g1' }, depth: 2, isParent: false },
    { task: { id: 'c2' }, depth: 1, isParent: false },
    { task: { id: 'r2' }, depth: 0, isParent: false },
  ]

  test('collapse at depth 0 hides all descendants', () => {
    expect(filterVisibleRows(FLAT, { r1: true }).map(r => r.task.id)).toEqual(['r1', 'r2'])
  })

  test('collapse at depth 1 hides only that subtree, preserves depth-0 siblings', () => {
    expect(filterVisibleRows(FLAT, { c1: true }).map(r => r.task.id)).toEqual(['r1', 'c1', 'c2', 'r2'])
  })
})
