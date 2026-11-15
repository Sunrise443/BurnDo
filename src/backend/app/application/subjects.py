from app.application.access import require_editor, require_member
from app.domain.errors import ConflictError, NotFoundError
from app.domain.models import Actor, Subject
from app.domain.ports import UnitOfWork
from app.domain.rules import clean_name


def list_subjects(uow: UnitOfWork, actor: Actor) -> list[Subject]:
    group_id, _role = require_member(actor)
    return uow.subjects.list_for_group(group_id)


def get_subject(uow: UnitOfWork, actor: Actor, subject_id: int) -> Subject:
    return _owned_subject(uow, actor, subject_id)


def create_subject(
    uow: UnitOfWork,
    actor: Actor,
    *,
    name: str,
    tag: str,
    teacher: str,
    class_links: str,
    assessment_type: str,
    passing_criteria: str,
    tasks_requirements: str,
    notes: str,
) -> Subject:
    subject = Subject(
        group_id=require_editor(actor),
        name=clean_name(name, empty_message="Укажите название предмета"),
        tag=tag.strip(),
        teacher=teacher.strip(),
        class_links=class_links.strip(),
        assessment_type=assessment_type.strip(),
        passing_criteria=passing_criteria.strip(),
        tasks_requirements=tasks_requirements.strip(),
        notes=notes.strip(),
    )
    uow.subjects.add(subject)
    uow.commit()
    return subject


def update_subject(
    uow: UnitOfWork,
    actor: Actor,
    subject_id: int,
    *,
    version: int,
    name: str,
    tag: str,
    teacher: str,
    class_links: str,
    assessment_type: str,
    passing_criteria: str,
    tasks_requirements: str,
    notes: str,
) -> Subject:
    current = _owned_subject(uow, actor, subject_id)
    require_editor(actor)
    if current.version != version:
        raise ConflictError("Данные уже обновлены", current=current)
    current.name = clean_name(name, empty_message="Укажите название предмета")
    current.tag = tag.strip()
    current.teacher = teacher.strip()
    current.class_links = class_links.strip()
    current.assessment_type = assessment_type.strip()
    current.passing_criteria = passing_criteria.strip()
    current.tasks_requirements = tasks_requirements.strip()
    current.notes = notes.strip()
    current.version = version + 1
    uow.subjects.save(current, expected_version=version)
    uow.commit()
    return current


def delete_subject(uow: UnitOfWork, actor: Actor, subject_id: int) -> None:
    _owned_subject(uow, actor, subject_id)
    require_editor(actor)
    task_ids = [task.id for task in uow.tasks.list_for_subject(subject_id)]
    uow.lessons.clear_task_links(task_ids)
    uow.lessons.delete_for_subject(subject_id)
    uow.tasks.delete_for_subject(subject_id)
    uow.subjects.delete(subject_id)
    uow.commit()


def _owned_subject(uow: UnitOfWork, actor: Actor, subject_id: int) -> Subject:
    group_id, _role = require_member(actor)
    subject = uow.subjects.get(subject_id)
    if subject is None or subject.group_id != group_id:
        raise NotFoundError("Предмет не найден")
    return subject
