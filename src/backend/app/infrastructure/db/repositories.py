from datetime import datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.domain.errors import ConflictError, NotFoundError
from app.domain.models import (
    Lesson,
    Membership,
    MemberView,
    PasswordReset,
    StudyGroup,
    Subject,
    Task,
    User,
)
from app.domain.models import (
    Session as DomainSession,
)
from app.domain.roles import Role
from app.infrastructure.db.mappers import (
    group_from_row,
    lesson_from_row,
    member_view,
    membership_from_row,
    reset_from_row,
    session_from_row,
    subject_from_row,
    task_from_row,
    user_from_row,
)
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


class UserStore:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, user_id: int) -> User | None:
        row = self._session.get(UserRow, user_id)
        return None if row is None else user_from_row(row)

    def get_by_email(self, email: str) -> User | None:
        row = self._session.scalar(select(UserRow).where(UserRow.email == email))
        return None if row is None else user_from_row(row)

    def add(self, user: User) -> User:
        row = UserRow(
            name=user.name,
            email=user.email,
            password_hash=user.password_hash,
            deleted_at=user.deleted_at,
        )
        self._session.add(row)
        self._session.flush()
        user.id = row.id
        return user

    def save(self, user: User) -> None:
        row = self._session.get(UserRow, user.id)
        if row is None:
            raise NotFoundError("Пользователь не найден")
        row.name = user.name
        row.password_hash = user.password_hash
        row.deleted_at = user.deleted_at


class SessionStore:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, session: DomainSession) -> DomainSession:
        row = SessionRow(
            user_id=session.user_id,
            token_hash=session.token_hash,
            expires_at=session.expires_at,
        )
        self._session.add(row)
        self._session.flush()
        session.id = row.id
        return session

    def get_by_token_hash(self, token_hash: str) -> DomainSession | None:
        row = self._session.scalar(select(SessionRow).where(SessionRow.token_hash == token_hash))
        return None if row is None else session_from_row(row)

    def delete_by_token_hash(self, token_hash: str) -> None:
        self._session.execute(delete(SessionRow).where(SessionRow.token_hash == token_hash))

    def delete_for_user(self, user_id: int) -> None:
        self._session.execute(delete(SessionRow).where(SessionRow.user_id == user_id))


class PasswordResetStore:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, reset: PasswordReset) -> PasswordReset:
        row = PasswordResetRow(
            user_id=reset.user_id,
            token_hash=reset.token_hash,
            expires_at=reset.expires_at,
            used_at=reset.used_at,
        )
        self._session.add(row)
        self._session.flush()
        reset.id = row.id
        return reset

    def get_by_token_hash(self, token_hash: str) -> PasswordReset | None:
        row = self._session.scalar(
            select(PasswordResetRow).where(PasswordResetRow.token_hash == token_hash)
        )
        return None if row is None else reset_from_row(row)

    def invalidate_unused(self, user_id: int, used_at: datetime) -> None:
        self._session.execute(
            update(PasswordResetRow)
            .where(
                PasswordResetRow.user_id == user_id,
                PasswordResetRow.used_at.is_(None),
            )
            .values(used_at=used_at)
        )

    def save(self, reset: PasswordReset) -> None:
        row = self._session.get(PasswordResetRow, reset.id)
        if row is None:
            raise NotFoundError("Ссылка недействительна или устарела")
        row.used_at = reset.used_at


class GroupStore:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, group: StudyGroup) -> StudyGroup:
        row = StudyGroupRow(
            name=group.name,
            invite_code=group.invite_code,
            timezone=group.timezone,
            head_user_id=group.head_user_id,
        )
        self._session.add(row)
        self._session.flush()
        group.id = row.id
        return group

    def get(self, group_id: int) -> StudyGroup | None:
        row = self._session.get(StudyGroupRow, group_id)
        return None if row is None else group_from_row(row)

    def get_by_invite_code(self, invite_code: str) -> StudyGroup | None:
        row = self._session.scalar(
            select(StudyGroupRow).where(StudyGroupRow.invite_code == invite_code)
        )
        return None if row is None else group_from_row(row)

    def save(self, group: StudyGroup) -> None:
        row = self._session.get(StudyGroupRow, group.id)
        if row is None:
            raise NotFoundError("Группа не найдена")
        row.name = group.name
        row.invite_code = group.invite_code
        row.timezone = group.timezone
        row.head_user_id = group.head_user_id


class MembershipStore:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, membership: Membership) -> Membership:
        row = MembershipRow(
            user_id=membership.user_id,
            group_id=membership.group_id,
            role=membership.role.value,
        )
        self._session.add(row)
        self._session.flush()
        membership.id = row.id
        return membership

    def get_by_user(self, user_id: int) -> Membership | None:
        row = self._session.scalar(select(MembershipRow).where(MembershipRow.user_id == user_id))
        return None if row is None else membership_from_row(row)

    def get_for_group(self, group_id: int, user_id: int) -> Membership | None:
        row = self._session.scalar(
            select(MembershipRow).where(
                MembershipRow.group_id == group_id,
                MembershipRow.user_id == user_id,
            )
        )
        return None if row is None else membership_from_row(row)

    def list_for_group(self, group_id: int) -> list[MemberView]:
        rows = self._session.execute(
            select(MembershipRow, UserRow)
            .join(UserRow, UserRow.id == MembershipRow.user_id)
            .where(MembershipRow.group_id == group_id, UserRow.deleted_at.is_(None))
            .order_by(UserRow.name)
        ).all()
        return [member_view(membership, user) for membership, user in rows]

    def count_others(self, group_id: int, user_id: int) -> int:
        count = self._session.scalar(
            select(func.count())
            .select_from(MembershipRow)
            .where(MembershipRow.group_id == group_id, MembershipRow.user_id != user_id)
        )
        return int(count or 0)

    def deputy(self, group_id: int) -> Membership | None:
        row = self._session.scalar(
            select(MembershipRow).where(
                MembershipRow.group_id == group_id,
                MembershipRow.role == Role.DEPUTY.value,
            )
        )
        return None if row is None else membership_from_row(row)

    def save(self, membership: Membership) -> None:
        row = self._session.get(MembershipRow, membership.id)
        if row is None:
            raise NotFoundError("Участник не найден")
        row.role = membership.role.value

    def delete_for_user(self, user_id: int) -> None:
        self._session.execute(delete(MembershipRow).where(MembershipRow.user_id == user_id))


class SubjectStore:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, subject: Subject) -> Subject:
        row = SubjectRow(
            group_id=subject.group_id,
            name=subject.name,
            tag=subject.tag,
            teacher=subject.teacher,
            class_links=subject.class_links,
            assessment_type=subject.assessment_type,
            passing_criteria=subject.passing_criteria,
            tasks_requirements=subject.tasks_requirements,
            notes=subject.notes,
            version=subject.version,
        )
        self._session.add(row)
        self._session.flush()
        subject.id = row.id
        return subject

    def get(self, subject_id: int) -> Subject | None:
        row = self._session.get(SubjectRow, subject_id)
        return None if row is None else subject_from_row(row)

    def list_for_group(self, group_id: int) -> list[Subject]:
        rows = self._session.scalars(
            select(SubjectRow)
            .where(SubjectRow.group_id == group_id)
            .order_by(SubjectRow.name, SubjectRow.id)
        ).all()
        return [subject_from_row(row) for row in rows]

    def save(self, subject: Subject, expected_version: int) -> None:
        result = self._session.execute(
            update(SubjectRow)
            .where(SubjectRow.id == subject.id, SubjectRow.version == expected_version)
            .values(
                name=subject.name,
                tag=subject.tag,
                teacher=subject.teacher,
                class_links=subject.class_links,
                assessment_type=subject.assessment_type,
                passing_criteria=subject.passing_criteria,
                tasks_requirements=subject.tasks_requirements,
                notes=subject.notes,
                version=subject.version,
            )
        )
        self._raise_if_stale(result.rowcount, subject.id, "Предмет не найден")

    def delete(self, subject_id: int) -> None:
        result = self._session.execute(delete(SubjectRow).where(SubjectRow.id == subject_id))
        if result.rowcount != 1:
            raise NotFoundError("Предмет не найден")

    def _raise_if_stale(self, rowcount: int | None, subject_id: int, missing: str) -> None:
        if rowcount == 1:
            self._session.expire_all()
            return
        self._session.expire_all()
        fresh = self.get(subject_id)
        if fresh is None:
            raise NotFoundError(missing)
        raise ConflictError("Данные уже обновлены", current=fresh)


class TaskStore:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, task: Task) -> Task:
        row = TaskRow(
            group_id=task.group_id,
            subject_id=task.subject_id,
            title=task.title,
            description=task.description,
            materials=task.materials,
            deadline=task.deadline,
            version=task.version,
        )
        self._session.add(row)
        self._session.flush()
        task.id = row.id
        return task

    def get(self, task_id: int) -> Task | None:
        row = self._session.get(TaskRow, task_id)
        return None if row is None else task_from_row(row)

    def list_for_group(self, group_id: int) -> list[Task]:
        rows = self._session.scalars(
            select(TaskRow)
            .where(TaskRow.group_id == group_id)
            .order_by(TaskRow.deadline, TaskRow.id)
        ).all()
        return [task_from_row(row) for row in rows]

    def list_for_subject(self, subject_id: int) -> list[Task]:
        rows = self._session.scalars(
            select(TaskRow)
            .where(TaskRow.subject_id == subject_id)
            .order_by(TaskRow.deadline, TaskRow.id)
        ).all()
        return [task_from_row(row) for row in rows]

    def list_upcoming(self, group_id: int, now: datetime, limit: int) -> list[Task]:
        rows = self._session.scalars(
            select(TaskRow)
            .where(TaskRow.group_id == group_id, TaskRow.deadline >= now)
            .order_by(TaskRow.deadline, TaskRow.id)
            .limit(limit)
        ).all()
        return [task_from_row(row) for row in rows]

    def list_between(self, group_id: int, start: datetime, end: datetime) -> list[Task]:
        rows = self._session.scalars(
            select(TaskRow)
            .where(
                TaskRow.group_id == group_id,
                TaskRow.deadline >= start,
                TaskRow.deadline < end,
            )
            .order_by(TaskRow.deadline, TaskRow.id)
        ).all()
        return [task_from_row(row) for row in rows]

    def save(self, task: Task, expected_version: int) -> None:
        result = self._session.execute(
            update(TaskRow)
            .where(TaskRow.id == task.id, TaskRow.version == expected_version)
            .values(
                subject_id=task.subject_id,
                title=task.title,
                description=task.description,
                materials=task.materials,
                deadline=task.deadline,
                version=task.version,
            )
        )
        if result.rowcount == 1:
            self._session.expire_all()
            return
        self._session.expire_all()
        fresh = self.get(task.id)
        if fresh is None:
            raise NotFoundError("Задание не найдено")
        raise ConflictError("Данные уже обновлены", current=fresh)

    def delete(self, task_id: int) -> None:
        result = self._session.execute(delete(TaskRow).where(TaskRow.id == task_id))
        if result.rowcount != 1:
            raise NotFoundError("Задание не найдено")

    def delete_for_subject(self, subject_id: int) -> None:
        self._session.execute(delete(TaskRow).where(TaskRow.subject_id == subject_id))


class LessonStore:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, lesson: Lesson) -> Lesson:
        row = LessonRow(
            group_id=lesson.group_id,
            subject_id=lesson.subject_id,
            task_id=lesson.task_id,
            starts_at=lesson.starts_at,
            ends_at=lesson.ends_at,
            classroom=lesson.classroom,
            version=lesson.version,
        )
        self._session.add(row)
        self._session.flush()
        lesson.id = row.id
        return lesson

    def get(self, lesson_id: int) -> Lesson | None:
        row = self._session.get(LessonRow, lesson_id)
        return None if row is None else lesson_from_row(row)

    def list_for_group(self, group_id: int) -> list[Lesson]:
        rows = self._session.scalars(
            select(LessonRow)
            .where(LessonRow.group_id == group_id)
            .order_by(LessonRow.starts_at, LessonRow.id)
        ).all()
        return [lesson_from_row(row) for row in rows]

    def list_for_subject(self, subject_id: int) -> list[Lesson]:
        rows = self._session.scalars(
            select(LessonRow)
            .where(LessonRow.subject_id == subject_id)
            .order_by(LessonRow.starts_at, LessonRow.id)
        ).all()
        return [lesson_from_row(row) for row in rows]

    def list_between(self, group_id: int, start: datetime, end: datetime) -> list[Lesson]:
        rows = self._session.scalars(
            select(LessonRow)
            .where(
                LessonRow.group_id == group_id,
                LessonRow.starts_at < end,
                LessonRow.ends_at > start,
            )
            .order_by(LessonRow.starts_at, LessonRow.id)
        ).all()
        return [lesson_from_row(row) for row in rows]

    def clear_task_links(self, task_ids: list[int]) -> None:
        if not task_ids:
            return
        self._session.execute(
            update(LessonRow).where(LessonRow.task_id.in_(task_ids)).values(task_id=None)
        )

    def save(self, lesson: Lesson, expected_version: int) -> None:
        result = self._session.execute(
            update(LessonRow)
            .where(LessonRow.id == lesson.id, LessonRow.version == expected_version)
            .values(
                subject_id=lesson.subject_id,
                task_id=lesson.task_id,
                starts_at=lesson.starts_at,
                ends_at=lesson.ends_at,
                classroom=lesson.classroom,
                version=lesson.version,
            )
        )
        if result.rowcount == 1:
            self._session.expire_all()
            return
        self._session.expire_all()
        fresh = self.get(lesson.id)
        if fresh is None:
            raise NotFoundError("Занятие не найдено")
        raise ConflictError("Данные уже обновлены", current=fresh)

    def delete(self, lesson_id: int) -> None:
        result = self._session.execute(delete(LessonRow).where(LessonRow.id == lesson_id))
        if result.rowcount != 1:
            raise NotFoundError("Занятие не найдено")

    def delete_for_subject(self, subject_id: int) -> None:
        self._session.execute(delete(LessonRow).where(LessonRow.subject_id == subject_id))
