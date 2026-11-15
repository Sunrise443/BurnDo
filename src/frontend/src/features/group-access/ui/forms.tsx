import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Account } from '@/entities/session/index.ts'
import type { Member, StudyGroup } from '@/entities/group/index.ts'
import { api, messageOf } from '@/shared/api/index.ts'
import { roleLabel } from '@/shared/model/index.ts'
import { Button, Notice, TextField, uiStyles } from '@/shared/ui/index.ts'

export function JoinForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => api('/groups/join', { method: 'POST', body: JSON.stringify({ code }) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      await queryClient.invalidateQueries({ queryKey: ['group'] })
      navigate('/calendar')
    },
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <form
      className={uiStyles.stack}
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <TextField label="Код приглашения" required value={code} onChange={(event) => setCode(event.target.value)} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>Вступить</Button>
    </form>
  )
}

export function LeaveGroupButton() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => api('/groups/leave', { method: 'POST' }),
    onSuccess: async () => {
      const me = queryClient.getQueryData<Account>(['me'])
      if (me) queryClient.setQueryData(['me'], { ...me, group_id: null, role: null, timezone: null })
      navigate('/join')
    },
    onError: (reason) => setError(messageOf(reason)),
  })
  return (
    <div className={uiStyles.stack}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="button" tone="ghost" onClick={() => mutation.mutate()}>Выйти из группы</Button>
    </div>
  )
}

export function GroupSettings({ group }: { group: StudyGroup }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(group.name)
  const [timezone, setTimezone] = useState(group.timezone)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () =>
      api<StudyGroup>('/groups/current', {
        method: 'PATCH',
        body: JSON.stringify({ name, timezone }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group'] })
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (reason) => setError(messageOf(reason)),
  })
  const rotate = useMutation({
    mutationFn: () => api<StudyGroup>('/groups/invites', { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group'] })
    },
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <form
      className={uiStyles.stack}
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <TextField label="Название группы" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="Часовой пояс" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
      <p>Код приглашения: {group.invite_code}</p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className={uiStyles.row}>
        <Button type="submit" disabled={mutation.isPending}>Сохранить группу</Button>
        <Button type="button" tone="ghost" onClick={() => rotate.mutate()}>Новый код</Button>
      </div>
    </form>
  )
}

export function MemberList({ members }: { members: Member[] }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['members'] })
    await queryClient.invalidateQueries({ queryKey: ['me'] })
  }
  const remove = useMutation({
    mutationFn: (userId: number) => api(`/groups/members/${userId}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (reason) => setError(messageOf(reason)),
  })
  const assign = useMutation({
    mutationFn: (userId: number) => api(`/groups/members/${userId}/deputy`, { method: 'POST' }),
    onSuccess: refresh,
    onError: (reason) => setError(messageOf(reason)),
  })
  const unassign = useMutation({
    mutationFn: (userId: number) => api(`/groups/members/${userId}/deputy`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <div className={uiStyles.stack}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {members.map((member) => (
        <article key={member.user_id} className={uiStyles.card}>
          <h3>{member.name}</h3>
          <p>{member.email}</p>
          <p>{roleLabel(member.role)}</p>
          {member.role === 'student' ? (
            <Button type="button" tone="ghost" onClick={() => assign.mutate(member.user_id)}>
              Назначить заместителем
            </Button>
          ) : null}
          {member.role === 'deputy' ? (
            <Button type="button" tone="ghost" onClick={() => unassign.mutate(member.user_id)}>
              Снять полномочия
            </Button>
          ) : null}
          {member.role !== 'head' ? (
            <Button type="button" tone="danger" onClick={() => remove.mutate(member.user_id)}>
              Исключить
            </Button>
          ) : null}
        </article>
      ))}
    </div>
  )
}
