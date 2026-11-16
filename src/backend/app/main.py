import logging
import time
from collections.abc import Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import Settings, settings
from app.domain.errors import DomainError
from app.domain.ports import Clock, Mailer
from app.infrastructure.clock import SystemClock
from app.infrastructure.db.uow import SqlUnitOfWork, build_uow_factory
from app.infrastructure.mail import SmtpMailer
from app.infrastructure.security import Argon2PasswordHasher, SecretTokenFactory
from app.presentation.api.errors import domain_error_response
from app.presentation.api.routes import router

logger = logging.getLogger("uvicorn.error")


def database_is_available(
    uow_factory: Callable[[], SqlUnitOfWork],
    attempts: int,
) -> bool:
    for attempt in range(attempts):
        uow = uow_factory()
        try:
            uow.ping()
            return True
        except SQLAlchemyError:
            if attempt == attempts - 1:
                return False
            time.sleep(1)
        finally:
            uow.close()
    return False


def create_app(
    *,
    uow_factory: Callable[[], SqlUnitOfWork] | None = None,
    mailer: Mailer | None = None,
    clock: Clock | None = None,
    app_settings: Settings | None = None,
    startup_attempts: int = 10,
) -> FastAPI:
    resolved_settings = settings if app_settings is None else app_settings
    resolved_factory = build_uow_factory() if uow_factory is None else uow_factory
    resolved_clock = SystemClock() if clock is None else clock
    resolved_mailer = mailer or SmtpMailer(
        resolved_settings.smtp_host,
        resolved_settings.smtp_port,
        resolved_settings.smtp_from,
    )

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        if database_is_available(resolved_factory, startup_attempts):
            logger.info("PostgreSQL connection established")
        else:
            logger.warning("PostgreSQL connection failed")
        yield

    app = FastAPI(title="BurnDo API", lifespan=lifespan)
    app.state.uow_factory = resolved_factory
    app.state.clock = resolved_clock
    app.state.hasher = Argon2PasswordHasher()
    app.state.tokens = SecretTokenFactory()
    app.state.mailer = resolved_mailer
    app.state.settings = resolved_settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(DomainError, domain_error_response)
    app.add_exception_handler(RequestValidationError, _validation_response)
    app.include_router(router)

    @app.get("/")
    def read_root() -> dict[str, str]:
        return {"message": "BurnDo API is running"}

    @app.get("/health")
    def health(response: Response) -> dict[str, str]:
        uow = resolved_factory()
        try:
            uow.ping()
        except SQLAlchemyError:
            response.status_code = 503
            return {"status": "error", "database": "unavailable"}
        else:
            return {"status": "ok", "database": "connected"}
        finally:
            uow.close()

    return app


def _validation_response(_request: Request, _exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"code": "validation", "message": "Проверьте заполнение полей"},
    )


app = create_app()
