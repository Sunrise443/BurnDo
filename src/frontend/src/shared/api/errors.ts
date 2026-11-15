import { errorFromBody, isVersionConflict, versionConflictNotice } from './client.ts'

export function messageOf(error: unknown): string {
  if (isVersionConflict(error)) {
    return versionConflictNotice
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Ошибка запроса'
}

export { errorFromBody }
