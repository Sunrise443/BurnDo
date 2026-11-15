import { Link, useParams } from 'react-router-dom'

import { useLessons } from '@/entities/lesson/index.ts'
import { useMe } from '@/entities/session/index.ts'
import { useSubject } from '@/entities/subject/index.ts'
import { useTasks } from '@/entities/task/index.ts'
import { DeleteSubjectButton, SubjectForm } from '@/features/subject-form/index.ts'
import { canEditAcademic } from '@/shared/model/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function SubjectDetailsPage() {
  const params = useParams()
  const subjectId = Number(params.subjectId)
  const me = useMe()
  const subject = useSubject(subjectId)
  const tasks = useTasks(subjectId)
  const lessons = useLessons(subjectId)
  if (subject.isLoading) return <p>Загрузка…</p>
  if (!subject.data) return <p>Предмет не найден.</p>
  const editable = canEditAcademic(me.data?.role)
  return (
    <div className={uiStyles.stack}>
      <h1>{subject.data.name}</h1>
      <Info label="Преподаватель" value={subject.data.teacher} />
      <Info label="Аттестация" value={subject.data.assessment_type} />
      <Info label="Требования" value={subject.data.passing_criteria} />
      <Info label="Правила сдачи" value={subject.data.tasks_requirements} />
      <Info label="Ссылки" value={subject.data.class_links} />
      <Info label="Заметки" value={subject.data.notes} />
      <section>
        <h2>Занятия</h2>
        {lessons.data?.length ? (
          lessons.data.map((lesson) => (
            <p key={lesson.id}>
              <Link to="/calendar">{lesson.subject_name}</Link> · {lesson.classroom}
            </p>
          ))
        ) : (
          <p>Занятий нет.</p>
        )}
      </section>
      <section>
        <h2>Задания</h2>
        {tasks.data?.length ? (
          tasks.data.map((task) => (
            <p key={task.id}><Link to={`/tasks/${task.id}`}>{task.title}</Link></p>
          ))
        ) : (
          <p>Заданий нет.</p>
        )}
      </section>
      {editable ? (
        <>
          <h2>Редактирование</h2>
          <SubjectForm subject={subject.data} />
          <DeleteSubjectButton subjectId={subject.data.id} />
        </>
      ) : null}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <section>
      <h2>{label}</h2>
      {value.split('\n').map((line) => (
        <p key={line}>
          {/^https?:\/\//i.test(line.trim()) ? (
            <a href={line.trim()} target="_blank" rel="noreferrer">{line.trim()}</a>
          ) : (
            line
          )}
        </p>
      ))}
    </section>
  )
}
