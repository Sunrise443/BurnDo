from app.domain.errors import PermissionError
from app.domain.models import Actor
from app.domain.roles import Role


def require_member(actor: Actor) -> tuple[int, Role]:
    if actor.group_id is None or actor.role is None:
        raise PermissionError("Сначала вступите в учебную группу")
    return actor.group_id, actor.role


def require_editor(actor: Actor) -> int:
    group_id, role = require_member(actor)
    if role is Role.STUDENT:
        raise PermissionError("Недостаточно прав")
    return group_id


def require_head(actor: Actor) -> int:
    group_id, role = require_member(actor)
    if role is not Role.HEAD:
        raise PermissionError("Недостаточно прав")
    return group_id
