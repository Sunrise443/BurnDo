import re
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.infrastructure.db.models import Base
from app.infrastructure.db.uow import build_uow_factory
from app.main import create_app


class MutableClock:
    def __init__(self) -> None:
        self.moment = datetime(2026, 11, 15, 8, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self.moment

    def advance(self, **kwargs: int) -> None:
        self.moment += timedelta(**kwargs)


class MemoryMailer:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str, str]] = []

    def send(self, recipient: str, subject: str, body: str) -> None:
        self.messages.append((recipient, subject, body))


@pytest.fixture
def clock() -> MutableClock:
    return MutableClock()


@pytest.fixture
def mailer() -> MemoryMailer:
    return MemoryMailer()


@pytest.fixture
def app(clock: MutableClock, mailer: MemoryMailer):
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    return create_app(
        uow_factory=build_uow_factory(factory),
        mailer=mailer,
        clock=clock,
        startup_attempts=1,
    )


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client


def register(
    client: TestClient,
    *,
    email: str,
    role: str = "student",
    name: str = "Студент",
    password: str = "password1",
    group_name: str = "ИВТ-401",
):
    return client.post(
        "/auth/register",
        json={
            "name": name,
            "email": email,
            "password": password,
            "role": role,
            "group_name": group_name,
        },
    )


def reset_token(mailer: MemoryMailer) -> str:
    match = re.search(r"token=(\S+)", mailer.messages[-1][2])
    assert match is not None
    return match.group(1)
