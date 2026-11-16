import { describe, expect, it } from 'vitest'

import { canEditAcademic, canManageMembers } from './role.ts'

describe('role access', () => {
  it('lets the head and deputy edit academic records', () => {
    expect(canEditAcademic('head')).toBe(true)
    expect(canEditAcademic('deputy')).toBe(true)
    expect(canEditAcademic('student')).toBe(false)
    expect(canEditAcademic(null)).toBe(false)
  })

  it('lets only the head manage members', () => {
    expect(canManageMembers('head')).toBe(true)
    expect(canManageMembers('deputy')).toBe(false)
    expect(canManageMembers('student')).toBe(false)
  })
})
