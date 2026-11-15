import { ChangePasswordForm, DeleteAccountButton, LogoutButton } from '@/features/auth/index.ts'
import { LeaveGroupButton } from '@/features/group-access/index.ts'
import { useMe } from '@/entities/session/index.ts'
import { roleLabel } from '@/shared/model/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function AccountPage() {
  const me = useMe()
  return (
    <div className={uiStyles.stack}>
      <h1>Аккаунт</h1>
      <p>{me.data?.name}</p>
      <p>{me.data?.email}</p>
      <p>{roleLabel(me.data?.role)}</p>
      <ChangePasswordForm />
      <LogoutButton />
      {me.data?.group_id ? <LeaveGroupButton /> : null}
      <DeleteAccountButton />
    </div>
  )
}
