from dataclasses import dataclass
from datetime import datetime

from app.domain.roles import Role


@dataclass(slots=True)
class User:
    name: str
    email: str
    password_hash: str
    deleted_at: datetime | None = None
    id: int = 0


@dataclass(slots=True)
class Session:
    user_id: int
    token_hash: str
    expires_at: datetime
    id: int = 0


@dataclass(slots=True)
class PasswordReset:
    user_id: int
    token_hash: str
    expires_at: datetime
    used_at: datetime | None = None
    id: int = 0


@dataclass(slots=True)
class StudyGroup:
    name: str
    invite_code: str
    timezone: str
    head_user_id: int | None
    id: int = 0


@dataclass(slots=True)
class Membership:
    user_id: int
    group_id: int
    role: Role
    id: int = 0


@dataclass(slots=True)
class Subject:
    group_id: int
    name: str
    tag: str
    teacher: str
    class_links: str
    assessment_type: str
    passing_criteria: str
    tasks_requirements: str
    notes: str
    version: int = 1
    id: int = 0


@dataclass(slots=True)
class Task:
    group_id: int
    subject_id: int
    title: str
    description: str
    materials: str
    deadline: datetime
    version: int = 1
    id: int = 0


@dataclass(slots=True)
class Lesson:
    group_id: int
    subject_id: int
    task_id: int | None
    starts_at: datetime
    ends_at: datetime
    classroom: str
    version: int = 1
    id: int = 0


@dataclass(frozen=True, slots=True)
class Actor:
    user_id: int
    group_id: int | None
    role: Role | None


@dataclass(frozen=True, slots=True)
class Account:
    id: int
    name: str
    email: str
    role: Role | None
    group_id: int | None
    group_name: str | None
    timezone: str | None


@dataclass(frozen=True, slots=True)
class MemberView:
    user_id: int
    name: str
    email: str
    role: Role


@dataclass(frozen=True, slots=True)
class GroupView:
    id: int
    name: str
    timezone: str
    invite_code: str | None


@dataclass(frozen=True, slots=True)
class TaskView:
    task: Task
    subject_name: str


@dataclass(frozen=True, slots=True)
class LessonView:
    lesson: Lesson
    subject_name: str
    task_title: str | None


@dataclass(frozen=True, slots=True)
class CalendarView:
    lessons: list[LessonView]
    deadlines: list[TaskView]
