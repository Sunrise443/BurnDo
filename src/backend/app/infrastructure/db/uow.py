from collections.abc import Callable

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.db.session import SessionLocal
from app.domain.errors import ConflictError
from app.infrastructure.db.repositories import (
    GroupStore,
    LessonStore,
    MembershipStore,
    PasswordResetStore,
    SessionStore,
    SubjectStore,
    TaskStore,
    UserStore,
)


class SqlUnitOfWork:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self.session = session_factory()
        self.users = UserStore(self.session)
        self.sessions = SessionStore(self.session)
        self.resets = PasswordResetStore(self.session)
        self.groups = GroupStore(self.session)
        self.memberships = MembershipStore(self.session)
        self.subjects = SubjectStore(self.session)
        self.tasks = TaskStore(self.session)
        self.lessons = LessonStore(self.session)

    def commit(self) -> None:
        try:
            self.session.commit()
        except IntegrityError as error:
            self.session.rollback()
            raise ConflictError("Такие данные уже существуют") from error

    def rollback(self) -> None:
        self.session.rollback()

    def close(self) -> None:
        self.session.close()

    def ping(self) -> None:
        self.session.execute(text("SELECT 1"))


def build_uow_factory(
    session_factory: sessionmaker[Session] | None = None,
) -> Callable[[], SqlUnitOfWork]:
    factory = SessionLocal if session_factory is None else session_factory

    def make() -> SqlUnitOfWork:
        return SqlUnitOfWork(factory)

    return make
