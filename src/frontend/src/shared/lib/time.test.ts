import { describe, expect, it } from 'vitest'

import { dayKey, fortnightRange, shiftMonth, toLocalInput, toUtcIso, weekRange } from './time.ts'

describe('group timezone', () => {
  it('converts a Moscow wall time to UTC and back', () => {
    const iso = toUtcIso('2026-11-15T10:00', 'Europe/Moscow')
    expect(iso).toBe('2026-11-15T07:00:00.000Z')
    expect(toLocalInput(iso, 'Europe/Moscow')).toBe('2026-11-15T10:00')
  })

  it('starts the week on Monday in the group timezone', () => {
    const sunday = new Date('2026-11-15T07:00:00.000Z')
    const week = weekRange(sunday, 'Europe/Moscow')
    expect(week.days[0]).toBe('2026-11-09')
    expect(week.days[6]).toBe('2026-11-15')
    expect(week.start).toBe('2026-11-08T21:00:00.000Z')
    expect(dayKey('2026-11-15T21:30:00.000Z', 'Europe/Moscow')).toBe('2026-11-16')
  })

  it('opens two weeks starting on Monday', () => {
    const sunday = new Date('2026-11-15T07:00:00.000Z')
    const fortnight = fortnightRange(sunday, 'Europe/Moscow')
    expect(fortnight.weeks).toHaveLength(2)
    expect(fortnight.weeks[0][0]).toBe('2026-11-09')
    expect(fortnight.weeks[1][6]).toBe('2026-11-22')
    expect(fortnight.end).toBe('2026-11-22T21:00:00.000Z')
  })

  it('steps a month without overflowing the last day', () => {
    const january = new Date('2026-01-31T09:00:00.000Z')
    const february = shiftMonth(january, 'Europe/Moscow', 1)
    expect(dayKey(february.toISOString(), 'Europe/Moscow')).toBe('2026-02-28')
    const december = shiftMonth(january, 'Europe/Moscow', -1)
    expect(dayKey(december.toISOString(), 'Europe/Moscow')).toBe('2025-12-31')
  })
})
