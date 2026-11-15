import { useQuery } from '@tanstack/react-query'

import { api } from '@/shared/api/index.ts'
import type { Role } from '@/shared/model/index.ts'

export type StudyGroup = {
  id: number
  name: string
  timezone: string
  invite_code: string | null
}

export type Member = {
  user_id: number
  name: string
  email: string
  role: Role
}

export function useGroup() {
  return useQuery({
    queryKey: ['group'],
    queryFn: () => api<StudyGroup>('/groups/current'),
  })
}

export function useMembers(enabled: boolean) {
  return useQuery({
    queryKey: ['members'],
    enabled,
    queryFn: () => api<Member[]>('/groups/members'),
  })
}
