import { describe, expect, it } from 'vitest'

import { errorFromBody, isVersionConflict, versionConflictNotice } from './client.ts'
import { messageOf } from './errors.ts'

describe('api errors', () => {
  it('reads a version conflict and its current record', () => {
    const error = errorFromBody(409, {
      code: 'conflict',
      message: 'Данные уже обновлены',
      current: { version: 2, name: 'История' },
    })
    expect(isVersionConflict(error)).toBe(true)
    expect(error.current).toEqual({ version: 2, name: 'История' })
    expect(messageOf(error)).toBe(versionConflictNotice)
  })

  it('uses the server message for other failures', () => {
    const error = errorFromBody(401, {
      code: 'authentication',
      message: 'Неверный email или пароль',
    })
    expect(isVersionConflict(error)).toBe(false)
    expect(messageOf(error)).toBe('Неверный email или пароль')
  })
})
