import { Navigate, Outlet } from 'react-router-dom'

import { useMe } from '@/entities/session/index.ts'

export function RequireAuth() {
  const me = useMe()
  if (me.isLoading) return <p>Загрузка…</p>
  if (!me.data) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireGroup() {
  const me = useMe()
  if (!me.data?.group_id) return <Navigate to="/join" replace />
  return <Outlet />
}
