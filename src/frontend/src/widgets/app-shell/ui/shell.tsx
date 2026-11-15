import { NavLink, Outlet } from 'react-router-dom'

import { useMe } from '@/entities/session/index.ts'
import { roleLabel } from '@/shared/model/index.ts'

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
          <NavLink to="/account">Аккаунт</NavLink>
        </nav>
        <p className={styles.who}>
          {account?.name} · {roleLabel(account?.role)}
        </p>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
