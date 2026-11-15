from datetime import datetime

from app.domain.models import (
    Account,
    GroupView,
    Lesson,
    LessonView,
    MemberView,
    Subject,
    Task,
    TaskView,
)


def _iso(value: datetime) -> str:
    return value.isoformat()


def account_payload(account: Account) -> dict[str, object]:
    return {
        "id": account.id,
        "name": account.name,
        "email": account.email,
        "role": None if account.role is None else account.role.value,
        "group_id": account.group_id,
        "group_name": account.group_name,
        "timezone": account.timezone,
    }


def group_payload(group: GroupView) -> dict[str, object]:
    return {
        "id": group.id,
        "name": group.name,
        "timezone": group.timezone,
        "invite_code": group.invite_code,
    }


def member_payload(member: MemberView) -> dict[str, object]:
    return {
        "user_id": member.user_id,
        "name": member.name,
        "email": member.email,
        "role": member.role.value,
    }


def subject_payload(subject: Subject) -> dict[str, object]:
    return {
        "id": subject.id,
        "group_id": subject.group_id,
        "name": subject.name,
        "tag": subject.tag,
        "teacher": subject.teacher,
        "class_links": subject.class_links,
        "assessment_type": subject.assessment_type,
        "passing_criteria": subject.passing_criteria,
        "tasks_requirements": subject.tasks_requirements,
        "notes": subject.notes,
        "version": subject.version,
    }


def task_payload(task: Task, subject_name: str, subject_tag: str = "") -> dict[str, object]:
    return {
        "id": task.id,
        "group_id": task.group_id,
        "subject_id": task.subject_id,
        "subject_name": subject_name,
        "subject_tag": subject_tag,
        "title": task.title,
        "description": task.description,
        "materials": task.materials,
        "deadline": _iso(task.deadline),
        "version": task.version,
    }


def task_view_payload(view: TaskView) -> dict[str, object]:
    return task_payload(view.task, view.subject_name, view.subject_tag)


def lesson_payload(
    lesson: Lesson, subject_name: str, task_title: str | None, subject_tag: str = ""
) -> dict[str, object]:
    return {
        "id": lesson.id,
        "group_id": lesson.group_id,
        "subject_id": lesson.subject_id,
        "subject_name": subject_name,
        "subject_tag": subject_tag,
        "task_id": lesson.task_id,
        "task_title": task_title,
        "starts_at": _iso(lesson.starts_at),
        "ends_at": _iso(lesson.ends_at),
        "classroom": lesson.classroom,
        "version": lesson.version,
    }


def lesson_view_payload(view: LessonView) -> dict[str, object]:
    return lesson_payload(view.lesson, view.subject_name, view.task_title, view.subject_tag)


def serialize_current(value: object) -> dict[str, object] | None:
    if isinstance(value, Subject):
        return subject_payload(value)
    if isinstance(value, Task):
        return task_payload(value, "")
    if isinstance(value, Lesson):
        return lesson_payload(value, "", None)
    return None
