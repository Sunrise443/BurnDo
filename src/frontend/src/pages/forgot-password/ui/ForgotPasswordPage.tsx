import { Link } from 'react-router-dom'

import { ForgotPasswordForm } from '@/features/auth/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function ForgotPasswordPage() {
  return (
    <main className={uiStyles.card} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
      <h1>Сброс пароля</h1>
      <ForgotPasswordForm />
      <p><Link to="/login">Вернуться ко входу</Link></p>
    </main>
  )
}
