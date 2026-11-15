from datetime import UTC, datetime

from app.domain.models import (
    Lesson,
    Membership,
    MemberView,
    PasswordReset,
    Session,
    StudyGroup,
    Subject,
    Task,
    User,
)
from app.domain.roles import Role
from app.infrastructure.db.models import (
    LessonRow,
    MembershipRow,
    PasswordResetRow,
    SessionRow,
    StudyGroupRow,
    SubjectRow,
    TaskRow,
    UserRow,
)


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def user_from_row(row: UserRow) -> User:
    return User(
        id=row.id,
        name=row.name,
        email=row.email,
        password_hash=row.password_hash,
        deleted_at=as_utc(row.deleted_at),
    )


def session_from_row(row: SessionRow) -> Session:
    expires_at = as_utc(row.expires_at)
    assert expires_at is not None
    return Session(
        id=row.id,
        user_id=row.user_id,
        token_hash=row.token_hash,
        expires_at=expires_at,
    )


def reset_from_row(row: PasswordResetRow) -> PasswordReset:
    expires_at = as_utc(row.expires_at)
    assert expires_at is not None
    return PasswordReset(
        id=row.id,
        user_id=row.user_id,
        token_hash=row.token_hash,
        expires_at=expires_at,
        used_at=as_utc(row.used_at),
    )


def group_from_row(row: StudyGroupRow) -> StudyGroup:
    return StudyGroup(
        id=row.id,
        name=row.name,
        invite_code=row.invite_code,
        timezone=row.timezone,
        head_user_id=row.head_user_id,
    )


def membership_from_row(row: MembershipRow) -> Membership:
    return Membership(
        id=row.id,
        user_id=row.user_id,
        group_id=row.group_id,
        role=Role(row.role),
    )


def member_view(row: MembershipRow, user: UserRow) -> MemberView:
    return MemberView(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=Role(row.role),
    )


def subject_from_row(row: SubjectRow) -> Subject:
    return Subject(
        id=row.id,
        group_id=row.group_id,
        name=row.name,
        tag=row.tag,
        teacher=row.teacher,
        class_links=row.class_links,
        assessment_type=row.assessment_type,
        passing_criteria=row.passing_criteria,
        tasks_requirements=row.tasks_requirements,
        notes=row.notes,
        version=row.version,
    )


def task_from_row(row: TaskRow) -> Task:
    deadline = as_utc(row.deadline)
    assert deadline is not None
    return Task(
        id=row.id,
        group_id=row.group_id,
        subject_id=row.subject_id,
        title=row.title,
        description=row.description,
        materials=row.materials,
        deadline=deadline,
        version=row.version,
    )


def lesson_from_row(row: LessonRow) -> Lesson:
    starts_at = as_utc(row.starts_at)
    ends_at = as_utc(row.ends_at)
    assert starts_at is not None and ends_at is not None
    return Lesson(
        id=row.id,
        group_id=row.group_id,
        subject_id=row.subject_id,
        task_id=row.task_id,
        starts_at=starts_at,
        ends_at=ends_at,
        classroom=row.classroom,
        version=row.version,
    )
