from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.domain.errors import ValidationError
from app.domain.models import Task


def clean_name(value: str, *, empty_message: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValidationError(empty_message)
    return cleaned


def normalize_email(value: str) -> str:
    return value.strip().lower()


def require_timezone(name: str) -> str:
    try:
        ZoneInfo(name)
    except ZoneInfoNotFoundError as error:
        raise ValidationError("Неизвестный часовой пояс") from error
    return name


def require_interval(starts_at: datetime, ends_at: datetime) -> None:
    if starts_at.tzinfo is None or ends_at.tzinfo is None:
        raise ValidationError("Укажите дату и время со смещением")
    if ends_at <= starts_at:
        raise ValidationError("Конец занятия должен быть позже начала")


_BIWEEKLY_DAYS = 14
_MAX_OCCURRENCES = 40


def repeat_every_two_weeks(
    starts_at: datetime, until: date | None, timezone: str
) -> list[datetime]:
    if until is None:
        raise ValidationError("Укажите дату, до которой повторять занятие")
    zone = ZoneInfo(require_timezone(timezone))
    local = starts_at.astimezone(zone)
    if until < local.date():
        raise ValidationError("Дата окончания повторения не может быть раньше начала")
    moments = [starts_at]
    step = 1
    while True:
        next_day = local.date() + timedelta(days=_BIWEEKLY_DAYS * step)
        if next_day > until:
            break
        if step >= _MAX_OCCURRENCES:
            raise ValidationError("Серия слишком длинная: не больше 40 занятий")
        moments.append(
            datetime(
                next_day.year,
                next_day.month,
                next_day.day,
                local.hour,
                local.minute,
                local.second,
                local.microsecond,
                tzinfo=zone,
            ).astimezone(UTC)
        )
        step += 1
    if len(moments) < 2:
        raise ValidationError("Укажите дату хотя бы через две недели после начала")
    return moments


def require_task_of_subject(task: Task, *, subject_id: int, group_id: int) -> None:
    if task.group_id != group_id or task.subject_id != subject_id:
        raise ValidationError("Задание относится к другому предмету")
