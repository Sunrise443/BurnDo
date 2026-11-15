from fastapi import Request
from fastapi.responses import JSONResponse

from app.domain.errors import DomainError
from app.presentation.api.serialize import serialize_current

_STATUS = {
    "validation": 422,
    "not_found": 404,
    "conflict": 409,
    "authentication": 401,
    "permission": 403,
    "email_taken": 409,
    "mail": 503,
}


def domain_error_response(_request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, DomainError):
        raise exc
    body: dict[str, object] = {"code": exc.code, "message": exc.message}
    current = serialize_current(exc.current)
    if current is not None:
        body["current"] = current
    return JSONResponse(status_code=_STATUS.get(exc.code, 400), content=body)
