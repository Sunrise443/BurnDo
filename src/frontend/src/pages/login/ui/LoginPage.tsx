import { Link } from 'react-router-dom'

import { LoginForm } from '@/features/auth/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function LoginPage() {
  return (
    <main className={uiStyles.card} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
      <h1>Вход</h1>
      <LoginForm />
      <p><Link to="/forgot-password">Забыли пароль?</Link></p>
      <p><Link to="/register">Регистрация</Link></p>
    </main>
  )
}
