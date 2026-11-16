import { useQuery } from '@tanstack/react-query'

import { ApiError, api } from '@/shared/api/index.ts'
import type { Role } from '@/shared/model/index.ts'

export type Account = {
  id: number
  name: string
  email: string
  role: Role | null
  group_id: number | null
  group_name: string | null
  timezone: string | null
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    retry: false,
    queryFn: async () => {
      try {
        return await api<Account>('/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
  })
}
