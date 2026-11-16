import { Link, useParams } from 'react-router-dom'

import { useLessons } from '@/entities/lesson/index.ts'
import { useMe } from '@/entities/session/index.ts'
import { useSubject, type Subject } from '@/entities/subject/index.ts'
import { useTasks } from '@/entities/task/index.ts'
import { DeleteSubjectButton, SubjectForm } from '@/features/subject-form/index.ts'
import { canEditAcademic } from '@/shared/model/index.ts'

import styles from './SubjectDetailsPage.module.css'

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
    <div className={styles.page}>
      <div className={styles.main}>
        <h1>{subject.data.name}</h1>
        {editable ? <SubjectForm key={subject.data.id} subject={subject.data} /> : <SubjectFacts subject={subject.data} />}
        {editable ? <DeleteSubjectButton subjectId={subject.data.id} /> : null}
      </div>
      <aside className={styles.side}>
        <section>
          <h2>Занятия</h2>
          {lessons.isLoading ? (
            <p className={styles.empty}>Загрузка…</p>
          ) : lessons.data?.length ? (
            lessons.data.map((lesson) => (
              <p key={lesson.id}>
                <Link to="/calendar">{lesson.subject_name}</Link>
                {lesson.classroom ? ` · ${lesson.classroom}` : ''}
              </p>
            ))
          ) : (
            <p className={styles.empty}>Занятий нет.</p>
          )}
        </section>
        <section>
          <h2>Задания</h2>
          {tasks.isLoading ? (
            <p className={styles.empty}>Загрузка…</p>
          ) : tasks.data?.length ? (
            tasks.data.map((task) => (
              <p key={task.id}>
                <Link to={`/tasks/${task.id}`}>{task.title}</Link>
              </p>
            ))
          ) : (
            <p className={styles.empty}>Заданий нет.</p>
          )}
        </section>
      </aside>
    </div>
  )
}

function SubjectFacts({ subject }: { subject: Subject }) {
  return (
    <div className={styles.facts}>
      <Fact label="Тег" value={subject.tag} />
      <Fact label="Преподаватель" value={subject.teacher} />
      <Fact label="Тип аттестации" value={subject.assessment_type} />
      <Fact label="Ссылки на пары и материалы" value={subject.class_links} />
      <Fact label="Требования к зачёту или экзамену" value={subject.passing_criteria} />
      <Fact label="Правила сдачи заданий" value={subject.tasks_requirements} />
      <Fact label="Заметки" value={subject.notes} />
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <section className={styles.fact}>
      <h2>{label}</h2>
      {value ? (
        value.split('\n').map((line, index) => (
          <p key={`${index}-${line}`}>
            {/^https?:\/\//i.test(line.trim()) ? (
              <a href={line.trim()} target="_blank" rel="noreferrer">
                {line.trim()}
              </a>
            ) : (
              line
            )}
          </p>
        ))
      ) : (
        <p className={styles.empty}>Не указано</p>
      )}
    </section>
  )
}
