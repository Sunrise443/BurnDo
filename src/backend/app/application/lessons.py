from datetime import date, datetime, timedelta

from app.application.access import require_editor, require_member
from app.domain.errors import ConflictError, NotFoundError, ValidationError
from app.domain.models import Actor, CalendarView, Lesson, LessonView, Task, TaskView
from app.domain.ports import UnitOfWork
from app.domain.rules import repeat_every_two_weeks, require_interval, require_task_of_subject


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
    subjects = {item.id: item for item in uow.subjects.list_for_group(group_id)}
    deadlines = [
        TaskView(
            task=task,
            subject_name=subjects[task.subject_id].name if task.subject_id in subjects else "",
            subject_tag=subjects[task.subject_id].tag if task.subject_id in subjects else "",
        )
        for task in tasks
    ]
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
    repeat_biweekly: bool = False,
    repeat_until: date | None = None,
) -> LessonView:
    group_id = require_editor(actor)
    require_interval(starts_at, ends_at)
    subject = _subject(uow, group_id, subject_id)
    task = _optional_task(uow, group_id, subject.id, task_id)
    slots = _slots(uow, group_id, starts_at, repeat_biweekly, repeat_until)
    lesson = _add_series(
        uow,
        group_id=group_id,
        subject_id=subject.id,
        task_id=None if task is None else task.id,
        classroom=classroom.strip(),
        slots=slots,
        duration=ends_at - starts_at,
    )
    if lesson is None:
        raise ValidationError("Не удалось создать занятие")
    uow.commit()
    return LessonView(
        lesson=lesson,
        subject_name=subject.name,
        subject_tag=subject.tag,
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
    repeat_biweekly: bool = False,
    repeat_until: date | None = None,
) -> LessonView:
    group_id = require_editor(actor)
    current = _owned_lesson(uow, group_id, lesson_id)
    require_interval(starts_at, ends_at)
    subject = _subject(uow, group_id, subject_id)
    task = _optional_task(uow, group_id, subject.id, task_id)
    slots = _slots(uow, group_id, starts_at, repeat_biweekly, repeat_until)
    if current.version != version:
        raise ConflictError("Данные уже обновлены", current=current)
    linked_task = None if task is None else task.id
    current.subject_id = subject.id
    current.task_id = linked_task
    current.starts_at = slots[0]
    current.ends_at = slots[0] + (ends_at - starts_at)
    current.classroom = classroom.strip()
    current.version = version + 1
    uow.lessons.save(current, expected_version=version)
    _add_series(
        uow,
        group_id=group_id,
        subject_id=subject.id,
        task_id=linked_task,
        classroom=current.classroom,
        slots=slots[1:],
        duration=ends_at - starts_at,
    )
    uow.commit()
    return LessonView(
        lesson=current,
        subject_name=subject.name,
        subject_tag=subject.tag,
        task_title=None if task is None else task.title,
    )


def delete_lesson(uow: UnitOfWork, actor: Actor, lesson_id: int) -> None:
    group_id = require_editor(actor)
    _owned_lesson(uow, group_id, lesson_id)
    uow.lessons.delete(lesson_id)
    uow.commit()


def _with_names(uow: UnitOfWork, group_id: int, lessons: list[Lesson]) -> list[LessonView]:
    subjects = {item.id: item for item in uow.subjects.list_for_group(group_id)}
    tasks = {item.id: item.title for item in uow.tasks.list_for_group(group_id)}
    return [
        LessonView(
            lesson=lesson,
            subject_name=subjects[lesson.subject_id].name if lesson.subject_id in subjects else "",
            subject_tag=subjects[lesson.subject_id].tag if lesson.subject_id in subjects else "",
            task_title=None if lesson.task_id is None else tasks.get(lesson.task_id),
        )
        for lesson in lessons
    ]


def _slots(
    uow: UnitOfWork,
    group_id: int,
    starts_at: datetime,
    repeat_biweekly: bool,
    repeat_until: date | None,
) -> list[datetime]:
    if not repeat_biweekly:
        return [starts_at]
    return repeat_every_two_weeks(starts_at, repeat_until, _timezone(uow, group_id))


def _add_series(
    uow: UnitOfWork,
    *,
    group_id: int,
    subject_id: int,
    task_id: int | None,
    classroom: str,
    slots: list[datetime],
    duration: timedelta,
) -> Lesson | None:
    first: Lesson | None = None
    for start in slots:
        lesson = uow.lessons.add(
            Lesson(
                group_id=group_id,
                subject_id=subject_id,
                task_id=task_id,
                starts_at=start,
                ends_at=start + duration,
                classroom=classroom,
            )
        )
        if first is None:
            first = lesson
    return first


def _timezone(uow: UnitOfWork, group_id: int) -> str:
    group = uow.groups.get(group_id)
    if group is None:
        raise NotFoundError("Группа не найдена")
    return group.timezone


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
