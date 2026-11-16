import { JoinForm } from '@/features/group-access/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function JoinPage() {
  return (
    <main className={uiStyles.card} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
      <h1>Вступить в группу</h1>
      <p>Введите код, который прислал староста.</p>
      <JoinForm />
    </main>
  )
}
