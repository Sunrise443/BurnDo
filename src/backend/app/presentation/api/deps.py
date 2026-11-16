from collections.abc import Iterator
from dataclasses import dataclass

from fastapi import Request
from starlette.responses import Response

from app.core.config import Settings
from app.domain.ports import Clock, Mailer, PasswordHasher, TokenFactory, UnitOfWork


@dataclass
class Services:
    uow: UnitOfWork
    clock: Clock
    hasher: PasswordHasher
    tokens: TokenFactory
    mailer: Mailer
    settings: Settings


def get_services(request: Request) -> Iterator[Services]:
    uow = request.app.state.uow_factory()
    services = Services(
        uow=uow,
        clock=request.app.state.clock,
        hasher=request.app.state.hasher,
        tokens=request.app.state.tokens,
        mailer=request.app.state.mailer,
        settings=request.app.state.settings,
    )
    try:
        yield services
    except Exception:
        uow.rollback()
        raise
    finally:
        uow.close()


def set_session_cookie(response: Response, settings: Settings, token: str) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        path="/",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(key=settings.cookie_name, path="/")
