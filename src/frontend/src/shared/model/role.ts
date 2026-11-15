export type Role = 'student' | 'head' | 'deputy'

export function roleLabel(role: Role | null | undefined): string {
  if (role === 'head') return 'Староста'
  if (role === 'deputy') return 'Заместитель старосты'
  if (role === 'student') return 'Студент'
  return 'Без группы'
}

export function canEditAcademic(role: Role | null | undefined): boolean {
  return role === 'head' || role === 'deputy'
}

export function canManageMembers(role: Role | null | undefined): boolean {
  return role === 'head'
}
