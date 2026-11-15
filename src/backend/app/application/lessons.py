from datetime import datetime

from app.application.access import require_editor, require_member
from app.domain.errors import ConflictError, NotFoundError, ValidationError
from app.domain.models import Actor, CalendarView, Lesson, LessonView, Task, TaskView
from app.domain.ports import UnitOfWork
from app.domain.rules import require_interval, require_task_of_subject


def list_lessons(uow: UnitOfWork, actor: Actor, subject_id: int | None) -> list[LessonView]:
    group_id, _role = require_member(actor)
    if subject_id is None:
        lessons = uow.lessons.list_for_group(group_id)
    else:
        lessons = [
            lesson
            for lesson in uow.lessons.list_for_subject(subject_id)
            if lesson.group_id == group_id
        ]
    return _with_names(uow, group_id, lessons)


def get_lesson(uow: UnitOfWork, actor: Actor, lesson_id: int) -> LessonView:
    group_id, _role = require_member(actor)
    lesson = _owned_lesson(uow, group_id, lesson_id)
    return _with_names(uow, group_id, [lesson])[0]


def calendar(uow: UnitOfWork, actor: Actor, start: datetime, end: datetime) -> CalendarView:
    group_id, _role = require_member(actor)
    if end <= start:
        raise ValidationError("Интервал календаря задан неверно")
    lessons = _with_names(uow, group_id, uow.lessons.list_between(group_id, start, end))
    tasks = uow.tasks.list_between(group_id, start, end)
    names = {item.id: item.name for item in uow.subjects.list_for_group(group_id)}
    deadlines = [TaskView(task=task, subject_name=names.get(task.subject_id, "")) for task in tasks]
    return CalendarView(lessons=lessons, deadlines=deadlines)


def create_lesson(
    uow: UnitOfWork,
    actor: Actor,
    *,
    subject_id: int,
    task_id: int | None,
    starts_at: datetime,
    ends_at: datetime,
    classroom: str,
) -> LessonView:
    group_id = require_editor(actor)
    require_interval(starts_at, ends_at)
    subject = _subject(uow, group_id, subject_id)
    task = _optional_task(uow, group_id, subject.id, task_id)
    lesson = uow.lessons.add(
        Lesson(
            group_id=group_id,
            subject_id=subject.id,
            task_id=None if task is None else task.id,
            starts_at=starts_at,
            ends_at=ends_at,
            classroom=classroom.strip(),
        )
    )
    uow.commit()
    return LessonView(
        lesson=lesson,
        subject_name=subject.name,
        task_title=None if task is None else task.title,
    )


def update_lesson(
    uow: UnitOfWork,
    actor: Actor,
    lesson_id: int,
    *,
    version: int,
    subject_id: int,
    task_id: int | None,
    starts_at: datetime,
    ends_at: datetime,
    classroom: str,
) -> LessonView:
    group_id = require_editor(actor)
    current = _owned_lesson(uow, group_id, lesson_id)
    require_interval(starts_at, ends_at)
    subject = _subject(uow, group_id, subject_id)
    task = _optional_task(uow, group_id, subject.id, task_id)
    if current.version != version:
        raise ConflictError("Данные уже обновлены", current=current)
    current.subject_id = subject.id
    current.task_id = None if task is None else task.id
    current.starts_at = starts_at
    current.ends_at = ends_at
    current.classroom = classroom.strip()
    current.version = version + 1
    uow.lessons.save(current, expected_version=version)
    uow.commit()
    return LessonView(
        lesson=current,
        subject_name=subject.name,
        task_title=None if task is None else task.title,
    )


def delete_lesson(uow: UnitOfWork, actor: Actor, lesson_id: int) -> None:
    group_id = require_editor(actor)
    _owned_lesson(uow, group_id, lesson_id)
    uow.lessons.delete(lesson_id)
    uow.commit()


def _with_names(uow: UnitOfWork, group_id: int, lessons: list[Lesson]) -> list[LessonView]:
    subjects = {item.id: item.name for item in uow.subjects.list_for_group(group_id)}
    tasks = {item.id: item.title for item in uow.tasks.list_for_group(group_id)}
    return [
        LessonView(
            lesson=lesson,
            subject_name=subjects.get(lesson.subject_id, ""),
            task_title=None if lesson.task_id is None else tasks.get(lesson.task_id),
        )
        for lesson in lessons
    ]


def _subject(uow: UnitOfWork, group_id: int, subject_id: int):
    subject = uow.subjects.get(subject_id)
    if subject is None or subject.group_id != group_id:
        raise NotFoundError("Предмет не найден")
    return subject


def _owned_lesson(uow: UnitOfWork, group_id: int, lesson_id: int) -> Lesson:
    lesson = uow.lessons.get(lesson_id)
    if lesson is None or lesson.group_id != group_id:
        raise NotFoundError("Занятие не найдено")
    return lesson


def _optional_task(
    uow: UnitOfWork, group_id: int, subject_id: int, task_id: int | None
) -> Task | None:
    if task_id is None:
        return None
    task = uow.tasks.get(task_id)
    if task is None or task.group_id != group_id:
        raise NotFoundError("Задание не найдено")
    require_task_of_subject(task, subject_id=subject_id, group_id=group_id)
    return task
