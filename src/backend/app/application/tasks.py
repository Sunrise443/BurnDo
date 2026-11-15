from datetime import datetime

from app.application.access import require_editor, require_member
from app.domain.errors import ConflictError, NotFoundError, ValidationError
from app.domain.models import Actor, Subject, Task, TaskView
from app.domain.ports import Clock, UnitOfWork
from app.domain.rules import clean_name

_UPCOMING_LIMIT = 200


def list_tasks(uow: UnitOfWork, actor: Actor, subject_id: int | None) -> list[TaskView]:
    group_id, _role = require_member(actor)
    if subject_id is None:
        tasks = uow.tasks.list_for_group(group_id)
    else:
        _owned_subject(uow, group_id, subject_id)
        tasks = [
            task for task in uow.tasks.list_for_subject(subject_id) if task.group_id == group_id
        ]
    return _with_names(uow, group_id, tasks)


def list_upcoming(uow: UnitOfWork, clock: Clock, actor: Actor) -> list[TaskView]:
    group_id, _role = require_member(actor)
    tasks = uow.tasks.list_upcoming(group_id, clock.now(), _UPCOMING_LIMIT)
    return _with_names(uow, group_id, tasks)


def get_task(uow: UnitOfWork, actor: Actor, task_id: int) -> TaskView:
    group_id, _role = require_member(actor)
    task = _owned_task(uow, group_id, task_id)
    subject = _owned_subject(uow, group_id, task.subject_id)
    return TaskView(task=task, subject_name=subject.name)


def create_task(
    uow: UnitOfWork,
    actor: Actor,
    *,
    subject_id: int,
    title: str,
    description: str,
    materials: str,
    deadline: datetime,
) -> TaskView:
    group_id = require_editor(actor)
    subject = _owned_subject(uow, group_id, subject_id)
    _require_deadline(deadline)
    task = uow.tasks.add(
        Task(
            group_id=group_id,
            subject_id=subject.id,
            title=clean_name(title, empty_message="Укажите название задания"),
            description=description.strip(),
            materials=materials.strip(),
            deadline=deadline,
        )
    )
    uow.commit()
    return TaskView(task=task, subject_name=subject.name)


def update_task(
    uow: UnitOfWork,
    actor: Actor,
    task_id: int,
    *,
    version: int,
    subject_id: int,
    title: str,
    description: str,
    materials: str,
    deadline: datetime,
) -> TaskView:
    group_id = require_editor(actor)
    current = _owned_task(uow, group_id, task_id)
    subject = _owned_subject(uow, group_id, subject_id)
    _require_deadline(deadline)
    if current.version != version:
        raise ConflictError("Данные уже обновлены", current=current)
    current.subject_id = subject.id
    current.title = clean_name(title, empty_message="Укажите название задания")
    current.description = description.strip()
    current.materials = materials.strip()
    current.deadline = deadline
    current.version = version + 1
    uow.tasks.save(current, expected_version=version)
    uow.commit()
    return TaskView(task=current, subject_name=subject.name)


def delete_task(uow: UnitOfWork, actor: Actor, task_id: int) -> None:
    group_id = require_editor(actor)
    _owned_task(uow, group_id, task_id)
    uow.lessons.clear_task_links([task_id])
    uow.tasks.delete(task_id)
    uow.commit()


def _with_names(uow: UnitOfWork, group_id: int, tasks: list[Task]) -> list[TaskView]:
    names = {item.id: item.name for item in uow.subjects.list_for_group(group_id)}
    return [TaskView(task=task, subject_name=names.get(task.subject_id, "")) for task in tasks]


def _owned_subject(uow: UnitOfWork, group_id: int, subject_id: int) -> Subject:
    subject = uow.subjects.get(subject_id)
    if subject is None or subject.group_id != group_id:
        raise NotFoundError("Предмет не найден")
    return subject


def _owned_task(uow: UnitOfWork, group_id: int, task_id: int) -> Task:
    task = uow.tasks.get(task_id)
    if task is None or task.group_id != group_id:
        raise NotFoundError("Задание не найдено")
    return task


def _require_deadline(deadline: datetime) -> None:
    if deadline.tzinfo is None:
        raise ValidationError("Укажите срок со смещением")
