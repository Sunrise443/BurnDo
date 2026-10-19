import { appConfig } from '@/shared/config/index.ts'
import styles from './HomePage.module.css'

export function HomePage() {
  return (
    <main className={styles.page}>
      <p className={styles.kicker}>Учебная группа</p>
      <h1 className={styles.title}>{appConfig.name}</h1>
      <p className={styles.lead}>{appConfig.description}</p>
    </main>
  )
}
