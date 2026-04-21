import { describe, test, expect } from '@jest/globals'
import { computeCriticalPath, addWorkingDays, getEarliestAllowedStart, toDateStr } from '../src/pages/production/ganttUtils.js'

describe('computeCriticalPath', () => {
  test('linear chain A→B→C: all three are critical', () => {
    const tasks = [
      { id: 'A', startDate: '2026-04-01', endDate: '2026-04-05', dependsOn: [] },
      { id: 'B', startDate: '2026-04-06', endDate: '2026-04-10', dependsOn: ['A'] },
      { id: 'C', startDate: '2026-04-11', endDate: '2026-04-15', dependsOn: ['B'] },
    ]
    const cp = computeCriticalPath(tasks)
    expect(cp).toContain('A')
    expect(cp).toContain('B')
    expect(cp).toContain('C')
  })

  test('diamond A→B→D, A→C→D: all four are critical', () => {
    const tasks = [
      { id: 'A', startDate: '2026-04-01', endDate: '2026-04-05', dependsOn: [] },
      { id: 'B', startDate: '2026-04-06', endDate: '2026-04-10', dependsOn: ['A'] },
      { id: 'C', startDate: '2026-04-06', endDate: '2026-04-09', dependsOn: ['A'] },
      { id: 'D', startDate: '2026-04-11', endDate: '2026-04-15', dependsOn: ['B', 'C'] },
    ]
    const cp = computeCriticalPath(tasks)
    expect(cp).toContain('A')
    expect(cp).toContain('B')
    expect(cp).toContain('C')
    expect(cp).toContain('D')
  })
})

describe('addWorkingDays', () => {
  test('Friday + 1 working day skips weekend to Monday', () => {
    // 2026-04-17 is a Friday
    const friday = new Date(2026, 3, 17)
    const result = addWorkingDays(friday, 1)
    expect(toDateStr(result)).toBe('2026-04-20')
  })
})

describe('getEarliestAllowedStart', () => {
  test('returns the day after the predecessor end date', () => {
    const tasks = [
      { id: 'A', startDate: '2026-04-01', endDate: '2026-04-05' },
      { id: 'B', startDate: '2026-04-06', endDate: '2026-04-10', dependsOn: ['A'] },
    ]
    const earliest = getEarliestAllowedStart('B', ['A'], tasks, [])
    expect(toDateStr(earliest)).toBe('2026-04-06')
  })
})
