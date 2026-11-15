from datetime import datetime
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


def require_task_of_subject(task: Task, *, subject_id: int, group_id: int) -> None:
    if task.group_id != group_id or task.subject_id != subject_id:
        raise ValidationError("Задание относится к другому предмету")
