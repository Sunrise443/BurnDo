import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useMe } from '@/entities/session/index.ts'
import { useSubjects } from '@/entities/subject/index.ts'
import { SubjectForm } from '@/features/subject-form/index.ts'
import { canEditAcademic } from '@/shared/model/index.ts'
import { Button, uiStyles } from '@/shared/ui/index.ts'

import styles from './SubjectListPage.module.css'

export function SubjectListPage() {
  const me = useMe()
  const subjects = useSubjects()
  const [creating, setCreating] = useState(false)
  return (
    <div className={uiStyles.stack}>
      <h1>Предметы</h1>
      {subjects.isLoading ? (
        <p>Загрузка…</p>
      ) : subjects.data?.length ? (
        <div className={styles.list}>
          {subjects.data.map((subject) => (
            <Link key={subject.id} className={styles.plate} to={`/subjects/${subject.id}`}>
              {subject.name}
            </Link>
          ))}
        </div>
      ) : (
        <p>Предметов пока нет.</p>
      )}
      {canEditAcademic(me.data?.role) ? (
        <>
          <Button type="button" onClick={() => setCreating((value) => !value)}>Новый предмет</Button>
          {creating ? <SubjectForm /> : null}
        </>
      ) : null}
    </div>
  )
}
