import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Account } from '@/entities/session/index.ts'
import { api, messageOf } from '@/shared/api/index.ts'
import { Button, Notice, TextField, uiStyles } from '@/shared/ui/index.ts'

export function LoginForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () =>
      api<Account>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (account) => {
      queryClient.setQueryData(['me'], account)
      navigate(account.group_id ? '/calendar' : '/join')
    },
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <form
      className={uiStyles.stack}
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        mutation.mutate()
      }}
    >
      <TextField label="Эл. почта" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField label="Пароль" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>Войти</Button>
    </form>
  )
}

export function RegisterForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'head'>('student')
  const [groupName, setGroupName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () =>
      api<Account>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          group_name: role === 'head' ? groupName : null,
        }),
      }),
    onSuccess: (account) => {
      queryClient.setQueryData(['me'], account)
      navigate(account.group_id ? '/calendar' : '/join')
    },
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <form
      className={uiStyles.stack}
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        mutation.mutate()
      }}
    >
      <TextField label="Имя" required value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="Эл. почта" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField label="Пароль" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
      <label>
        Роль
        <select value={role} onChange={(event) => setRole(event.target.value as 'student' | 'head')}>
          <option value="student">Студент</option>
          <option value="head">Староста</option>
        </select>
      </label>
      {role === 'head' ? (
        <TextField label="Название группы" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>Создать аккаунт</Button>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () =>
      api('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
    onSuccess: () => setMessage('Если адрес зарегистрирован, мы отправили ссылку для сброса пароля.'),
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <form
      className={uiStyles.stack}
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        mutation.mutate()
      }}
    >
      <TextField label="Эл. почта" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      {message ? <Notice>{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>Отправить ссылку</Button>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () =>
      api('/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
    onSuccess: () => navigate('/login'),
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
      <TextField label="Новый пароль" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>Сохранить пароль</Button>
    </form>
  )
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () =>
      api('/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Пароль изменён')
    },
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <form
      className={uiStyles.stack}
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        setMessage(null)
        mutation.mutate()
      }}
    >
      <TextField label="Текущий пароль" type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      <TextField label="Новый пароль" type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      {message ? <Notice>{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>Сменить пароль</Button>
    </form>
  )
}

export function DeleteAccountButton() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => api('/auth/account', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      navigate('/login')
    },
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <div className={uiStyles.stack}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="button" tone="danger" onClick={() => setOpen(true)}>Удалить аккаунт</Button>
      {open ? (
        <div className={uiStyles.card}>
          <p>Аккаунт будет помечен удалённым, а доступ к группе прекратится.</p>
          <div className={uiStyles.row}>
            <Button type="button" tone="danger" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              Удалить
            </Button>
            <Button type="button" tone="ghost" onClick={() => setOpen(false)}>Отмена</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function LogoutButton() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      navigate('/login')
    },
  })
  return (
    <Button type="button" tone="ghost" onClick={() => mutation.mutate()}>
      Выйти
    </Button>
  )
}
