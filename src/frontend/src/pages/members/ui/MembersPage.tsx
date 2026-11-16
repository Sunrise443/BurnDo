import { useGroup, useMembers } from '@/entities/group/index.ts'
import { GroupSettings, MemberList } from '@/features/group-access/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function MembersPage() {
  const group = useGroup()
  const members = useMembers(true)
  if (!group.data) return <p>Загрузка группы…</p>
  return (
    <div className={uiStyles.stack}>
      <h1>{group.data.name}</h1>
      <GroupSettings group={group.data} />
      <h2>Участники</h2>
      {members.isError ? <p>Список участников доступен старосте.</p> : null}
      {members.data ? <MemberList members={members.data} /> : null}
      {members.isLoading ? <p>Загрузка участников…</p> : null}
    </div>
  )
}
