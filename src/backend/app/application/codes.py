from app.domain.errors import ConflictError
from app.domain.ports import TokenFactory, UnitOfWork


def unique_invite_code(uow: UnitOfWork, tokens: TokenFactory) -> str:
    for _ in range(5):
        code = tokens.invite_code()
        if uow.groups.get_by_invite_code(code) is None:
            return code
    raise ConflictError("Не удалось создать код приглашения")
