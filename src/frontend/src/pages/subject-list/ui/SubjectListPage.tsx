import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useMe } from '@/entities/session/index.ts'
import { useSubjects } from '@/entities/subject/index.ts'
import { SubjectForm } from '@/features/subject-form/index.ts'
import { canEditAcademic } from '@/shared/model/index.ts'
import { Button, uiStyles } from '@/shared/ui/index.ts'

export function SubjectListPage() {
  const me = useMe()
  const subjects = useSubjects()
  const [creating, setCreating] = useState(false)
  return (
    <div className={uiStyles.stack}>
      <h1>Предметы</h1>
      {subjects.data?.length ? (
        subjects.data.map((subject) => (
          <article key={subject.id} className={uiStyles.card}>
            <h2><Link to={`/subjects/${subject.id}`}>{subject.name}</Link></h2>
            <p>{subject.teacher || 'Преподаватель не указан'}</p>
          </article>
        ))
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
