from app.application.access import require_head, require_member
from app.application.codes import unique_invite_code
from app.domain.errors import ConflictError, NotFoundError, ValidationError
from app.domain.models import Actor, GroupView, Membership, MemberView
from app.domain.ports import TokenFactory, UnitOfWork
from app.domain.roles import Role
from app.domain.rules import clean_name, require_timezone


def current_group(uow: UnitOfWork, actor: Actor) -> GroupView:
    group_id, role = require_member(actor)
    group = _group(uow, group_id)
    invite_code = group.invite_code if role is Role.HEAD else None
    return GroupView(
        id=group.id,
        name=group.name,
        timezone=group.timezone,
        invite_code=invite_code,
    )


def update_group(
    uow: UnitOfWork,
    actor: Actor,
    *,
    name: str | None,
    timezone: str | None,
) -> GroupView:
    group = _group(uow, require_head(actor))
    if name is not None:
        group.name = clean_name(name, empty_message="Укажите название группы")
    if timezone is not None:
        group.timezone = require_timezone(timezone)
    uow.groups.save(group)
    uow.commit()
    return GroupView(
        id=group.id,
        name=group.name,
        timezone=group.timezone,
        invite_code=group.invite_code,
    )


def rotate_invite(uow: UnitOfWork, tokens: TokenFactory, actor: Actor) -> GroupView:
    group = _group(uow, require_head(actor))
    group.invite_code = unique_invite_code(uow, tokens)
    uow.groups.save(group)
    uow.commit()
    return GroupView(
        id=group.id,
        name=group.name,
        timezone=group.timezone,
        invite_code=group.invite_code,
    )


def join_group(uow: UnitOfWork, actor: Actor, code: str) -> None:
    if uow.memberships.get_by_user(actor.user_id) is not None:
        raise ConflictError("Вы уже состоите в учебной группе")
    group = uow.groups.get_by_invite_code(code.strip().upper())
    if group is None:
        raise NotFoundError("Приглашение не найдено")
    uow.memberships.add(Membership(user_id=actor.user_id, group_id=group.id, role=Role.STUDENT))
    uow.commit()


def leave_group(uow: UnitOfWork, actor: Actor) -> None:
    membership = uow.memberships.get_by_user(actor.user_id)
    if membership is None:
        raise NotFoundError("Вы не состоите в группе")
    if membership.role is Role.HEAD:
        others = uow.memberships.count_others(membership.group_id, actor.user_id)
        if others:
            raise ConflictError("Староста не может выйти, пока в группе есть другие участники")
        group = uow.groups.get(membership.group_id)
        if group is not None:
            group.head_user_id = None
            uow.groups.save(group)
    uow.memberships.delete_for_user(actor.user_id)
    uow.commit()


def list_members(uow: UnitOfWork, actor: Actor) -> list[MemberView]:
    return uow.memberships.list_for_group(require_head(actor))


def remove_member(uow: UnitOfWork, actor: Actor, user_id: int) -> None:
    group_id = require_head(actor)
    if user_id == actor.user_id:
        raise ValidationError("Староста не может исключить себя")
    membership = uow.memberships.get_for_group(group_id, user_id)
    if membership is None:
        raise NotFoundError("Участник не найден")
    uow.memberships.delete_for_user(user_id)
    uow.commit()


def assign_deputy(uow: UnitOfWork, actor: Actor, user_id: int) -> None:
    group_id = require_head(actor)
    membership = uow.memberships.get_for_group(group_id, user_id)
    if membership is None:
        raise NotFoundError("Участник не найден")
    if membership.role is Role.HEAD:
        raise ValidationError("Старосту нельзя назначить заместителем")
    if membership.role is Role.DEPUTY:
        return
    if uow.memberships.deputy(group_id) is not None:
        raise ConflictError("В группе уже есть заместитель старосты")
    membership.role = Role.DEPUTY
    uow.memberships.save(membership)
    uow.commit()


def unassign_deputy(uow: UnitOfWork, actor: Actor, user_id: int) -> None:
    group_id = require_head(actor)
    membership = uow.memberships.get_for_group(group_id, user_id)
    if membership is None or membership.role is not Role.DEPUTY:
        raise NotFoundError("Заместитель не найден")
    membership.role = Role.STUDENT
    uow.memberships.save(membership)
    uow.commit()


def _group(uow: UnitOfWork, group_id: int):
    group = uow.groups.get(group_id)
    if group is None:
        raise NotFoundError("Группа не найдена")
    return group
