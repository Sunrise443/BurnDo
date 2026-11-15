import { useSearchParams } from 'react-router-dom'

import { ResetPasswordForm } from '@/features/auth/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  return (
    <main className={uiStyles.card} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
      <h1>Новый пароль</h1>
      {token ? <ResetPasswordForm token={token} /> : <p>В ссылке нет токена.</p>}
    </main>
  )
}
