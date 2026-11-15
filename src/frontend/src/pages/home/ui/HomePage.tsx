import { Link, Navigate } from 'react-router-dom'

import { useMe } from '@/entities/session/index.ts'
import { appConfig } from '@/shared/config/index.ts'

import styles from './HomePage.module.css'

export function HomePage() {
  const me = useMe()
  if (me.isLoading) return <main className={styles.page}>Загрузка…</main>
  if (me.data?.group_id) return <Navigate to="/calendar" replace />
  if (me.data) return <Navigate to="/join" replace />

  return (
    <main className={styles.page}>
      <p className={styles.kicker}>Учебная группа</p>
      <h1 className={styles.title}>{appConfig.name}</h1>
      <p className={styles.lead}>{appConfig.description}</p>
      <p className={styles.actions}>
        <Link to="/login">Войти</Link>
        <Link to="/register">Регистрация</Link>
      </p>
    </main>
  )
}
