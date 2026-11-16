import { useState } from "react";
import { Link } from "react-router-dom";

import { useGroup } from "@/entities/group/index.ts";
import { useMe } from "@/entities/session/index.ts";
import { useSubjects } from "@/entities/subject/index.ts";
import { useTasks, type Task } from "@/entities/task/index.ts";
import { TaskForm } from "@/features/task-form/index.ts";
import { formatDateTime } from "@/shared/lib/index.ts";
import { canEditAcademic } from "@/shared/model/index.ts";
import { Button, SelectMenu, uiStyles } from "@/shared/ui/index.ts";

import styles from "./TaskListPage.module.css";

export function TaskListPage() {
  const me = useMe();
  const group = useGroup();
  const subjects = useSubjects();
  const [subjectId, setSubjectId] = useState("");
  const tasks = useTasks(subjectId ? Number(subjectId) : undefined);
  const [creating, setCreating] = useState(false);
  const timeZone = group.data?.timezone ?? "Europe/Moscow";
  const ordered = [...(tasks.data ?? [])].sort(byDeadline);
  const subjectOptions = [
    { value: "", label: "Все предметы" },
    ...(subjects.data ?? []).map((subject) => ({
      value: String(subject.id),
      label: subject.name,
    })),
  ];

  return (
    <div className={uiStyles.stack}>
      <div className={styles.head}>
        <h1>Задания</h1>
        <div className={styles.filter}>
          <SelectMenu
            label="Предмет"
            hideLabel
            value={subjectId}
            options={subjectOptions}
            onChange={setSubjectId}
          />
        </div>
      </div>
      {tasks.isLoading ? <p>Загрузка…</p> : null}
      {tasks.isError ? <p>Не удалось загрузить задания.</p> : null}
      {tasks.data && ordered.length === 0 ? (
        <p>
          {subjectId ? "По этому предмету заданий нет." : "Заданий пока нет."}
        </p>
      ) : null}
      {ordered.map((task) => (
        <article key={task.id} className={uiStyles.card}>
          <h3>
            <Link to={`/tasks/${task.id}`}>{task.title}</Link>
          </h3>
          <p>{task.subject_name}</p>
          <p>{formatDateTime(task.deadline, timeZone)}</p>
        </article>
      ))}
      {canEditAcademic(me.data?.role) && subjects.data?.length ? (
        <>
          <Button type="button" onClick={() => setCreating((value) => !value)}>
            Новое задание
          </Button>
          {creating ? (
            <TaskForm subjects={subjects.data} timeZone={timeZone} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function byDeadline(left: Task, right: Task) {
  const byTime = left.deadline.localeCompare(right.deadline);
  return byTime || left.id - right.id;
}
