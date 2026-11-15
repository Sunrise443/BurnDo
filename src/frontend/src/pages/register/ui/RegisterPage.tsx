import { Link } from 'react-router-dom'

import { RegisterForm } from '@/features/auth/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function RegisterPage() {
  return (
    <main className={uiStyles.card} style={{ maxWidth: '32rem', margin: '4rem auto' }}>
      <h1>Регистрация</h1>
      <RegisterForm />
      <p><Link to="/login">Уже есть аккаунт</Link></p>
    </main>
  )
}
