import { NavLink, Outlet } from 'react-router-dom'

import { useMe } from '@/entities/session/index.ts'

import styles from './shell.module.css'

export function AppShell() {
  const me = useMe()
  const account = me.data
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <NavLink to="/calendar" className={styles.brand}>BurnDo</NavLink>
        <nav className={styles.nav}>
          <NavLink to="/calendar">Календарь</NavLink>
          <NavLink to="/subjects">Предметы</NavLink>
          <NavLink to="/tasks">Задания</NavLink>
          {account?.role === 'head' ? <NavLink to="/members">Группа</NavLink> : null}
        </nav>
        <NavLink to="/account" className={styles.profile} aria-label="Аккаунт">
          <ProfileIcon />
        </NavLink>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

function ProfileIcon() {
  return (
    <svg className={styles.profileIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.15" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.4 19.2a6.8 6.8 0 0 1 13.2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
