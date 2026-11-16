import { Link, Navigate } from 'react-router-dom'

import { useMe } from '@/entities/session/index.ts'
import { LoginForm } from '@/features/auth/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function LoginPage() {
  const me = useMe()
  if (me.isLoading) return <main className={uiStyles.card} style={{ maxWidth: '28rem', margin: '4rem auto' }}>Загрузка…</main>
  if (me.data?.group_id) return <Navigate to="/calendar" replace />
  if (me.data) return <Navigate to="/join" replace />

  return (
    <main className={uiStyles.card} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
      <h1>Вход</h1>
      <LoginForm />
      <p><Link to="/forgot-password">Забыли пароль?</Link></p>
      <p><Link to="/register">Регистрация</Link></p>
    </main>
  )
}
