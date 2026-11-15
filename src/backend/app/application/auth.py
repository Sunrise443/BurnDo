from datetime import datetime, timedelta

from app.application.codes import unique_invite_code
from app.domain.errors import (
    AuthenticationError,
    ConflictError,
    EmailTakenError,
    MailDeliveryError,
    NotFoundError,
    ValidationError,
)
from app.domain.models import Account, Actor, Membership, PasswordReset, Session, StudyGroup, User
from app.domain.ports import Clock, Mailer, PasswordHasher, TokenFactory, UnitOfWork
from app.domain.roles import Role
from app.domain.rules import clean_name, normalize_email, require_timezone
from app.domain.tokens import hash_token

_INVALID_RESET = "Ссылка недействительна или устарела"


def register_user(
    uow: UnitOfWork,
    hasher: PasswordHasher,
    tokens: TokenFactory,
    clock: Clock,
    *,
    name: str,
    email: str,
    password: str,
    role: Role,
    group_name: str,
    session_ttl: timedelta,
    default_timezone: str,
) -> str:
    cleaned_name = clean_name(name, empty_message="Укажите имя")
    normalized_email = normalize_email(email)
    if role not in (Role.STUDENT, Role.HEAD):
        raise ValidationError("Выберите роль студента или старосты")
    if uow.users.get_by_email(normalized_email) is not None:
        raise EmailTakenError("Пользователь с таким адресом уже зарегистрирован")

    user = uow.users.add(
        User(
            name=cleaned_name,
            email=normalized_email,
            password_hash=hasher.hash(password),
        )
    )
    if role is Role.HEAD:
        title = group_name.strip() or "Учебная группа"
        group = uow.groups.add(
            StudyGroup(
                name=clean_name(title, empty_message="Укажите название группы"),
                invite_code=unique_invite_code(uow, tokens),
                timezone=require_timezone(default_timezone),
                head_user_id=user.id,
            )
        )
        uow.memberships.add(Membership(user_id=user.id, group_id=group.id, role=Role.HEAD))
    raw_token = _open_session(uow, tokens, clock, user.id, session_ttl)
    uow.commit()
    return raw_token


def login(
    uow: UnitOfWork,
    hasher: PasswordHasher,
    tokens: TokenFactory,
    clock: Clock,
    *,
    email: str,
    password: str,
    session_ttl: timedelta,
) -> str:
    user = uow.users.get_by_email(normalize_email(email))
    password_hash = None if user is None else user.password_hash
    matches = hasher.verify(password, password_hash)
    if user is None or user.deleted_at is not None or not matches:
        raise AuthenticationError("Неверный email или пароль")
    raw_token = _open_session(uow, tokens, clock, user.id, session_ttl)
    uow.commit()
    return raw_token


def logout(uow: UnitOfWork, raw_token: str | None) -> None:
    if raw_token:
        uow.sessions.delete_by_token_hash(hash_token(raw_token))
        uow.commit()


def authenticate(uow: UnitOfWork, clock: Clock, raw_token: str | None) -> Actor:
    if not raw_token:
        raise AuthenticationError("Требуется вход")
    record = uow.sessions.get_by_token_hash(hash_token(raw_token))
    if record is None or record.expires_at <= clock.now():
        raise AuthenticationError("Требуется вход")
    user = uow.users.get(record.user_id)
    if user is None or user.deleted_at is not None:
        raise AuthenticationError("Требуется вход")
    membership = uow.memberships.get_by_user(user.id)
    if membership is None:
        return Actor(user_id=user.id, group_id=None, role=None)
    return Actor(user_id=user.id, group_id=membership.group_id, role=membership.role)


def account_for(uow: UnitOfWork, user_id: int) -> Account:
    user = uow.users.get(user_id)
    if user is None or user.deleted_at is not None:
        raise AuthenticationError("Требуется вход")
    membership = uow.memberships.get_by_user(user_id)
    if membership is None:
        return Account(
            id=user.id,
            name=user.name,
            email=user.email,
            role=None,
            group_id=None,
            group_name=None,
            timezone=None,
        )
    group = uow.groups.get(membership.group_id)
    return Account(
        id=user.id,
        name=user.name,
        email=user.email,
        role=membership.role,
        group_id=membership.group_id,
        group_name=None if group is None else group.name,
        timezone=None if group is None else group.timezone,
    )


def change_password(
    uow: UnitOfWork,
    hasher: PasswordHasher,
    actor: Actor,
    *,
    current_password: str,
    new_password: str,
) -> None:
    user = uow.users.get(actor.user_id)
    if user is None or not hasher.verify(current_password, user.password_hash):
        raise ValidationError("Текущий пароль указан неверно")
    user.password_hash = hasher.hash(new_password)
    uow.users.save(user)
    uow.commit()


def request_password_reset(
    uow: UnitOfWork,
    tokens: TokenFactory,
    clock: Clock,
    mailer: Mailer,
    *,
    email: str,
    reset_ttl: timedelta,
    frontend_origin: str,
) -> None:
    user = uow.users.get_by_email(normalize_email(email))
    if user is None or user.deleted_at is not None:
        return
    now = clock.now()
    uow.resets.invalidate_unused(user.id, now)
    raw_token = tokens.reset_token()
    uow.resets.add(
        PasswordReset(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=now + reset_ttl,
        )
    )
    uow.commit()
    link = f"{frontend_origin.rstrip('/')}/reset-password?token={raw_token}"
    body = (
        "Чтобы задать новый пароль в BurnDo, откройте ссылку. "
        f"Она действует {int(reset_ttl.total_seconds() // 60)} минут.\n\n{link}\n"
    )
    try:
        mailer.send(user.email, "Сброс пароля BurnDo", body)
    except Exception as error:
        raise MailDeliveryError("Не удалось отправить письмо") from error


def reset_password(
    uow: UnitOfWork,
    hasher: PasswordHasher,
    clock: Clock,
    *,
    token: str,
    new_password: str,
) -> None:
    record = uow.resets.get_by_token_hash(hash_token(token))
    now = clock.now()
    if record is None or record.used_at is not None or record.expires_at <= now:
        raise ValidationError(_INVALID_RESET)
    user = uow.users.get(record.user_id)
    if user is None or user.deleted_at is not None:
        raise ValidationError(_INVALID_RESET)
    user.password_hash = hasher.hash(new_password)
    uow.users.save(user)
    record.used_at = now
    uow.resets.save(record)
    uow.sessions.delete_for_user(user.id)
    uow.commit()


def delete_account(uow: UnitOfWork, clock: Clock, actor: Actor) -> None:
    membership = uow.memberships.get_by_user(actor.user_id)
    if membership is not None and membership.role is Role.HEAD:
        others = uow.memberships.count_others(membership.group_id, actor.user_id)
        if others:
            raise ConflictError("Сначала исключите остальных участников группы")
        group = uow.groups.get(membership.group_id)
        if group is not None:
            group.head_user_id = None
            uow.groups.save(group)
    user = uow.users.get(actor.user_id)
    if user is None:
        raise NotFoundError("Пользователь не найден")
    uow.memberships.delete_for_user(actor.user_id)
    uow.sessions.delete_for_user(actor.user_id)
    user.deleted_at = clock.now()
    uow.users.save(user)
    uow.commit()


def _open_session(
    uow: UnitOfWork,
    tokens: TokenFactory,
    clock: Clock,
    user_id: int,
    session_ttl: timedelta,
) -> str:
    raw_token = tokens.session_token()
    expires_at: datetime = clock.now() + session_ttl
    uow.sessions.add(
        Session(user_id=user_id, token_hash=hash_token(raw_token), expires_at=expires_at)
    )
    return raw_token
