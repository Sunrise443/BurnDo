from datetime import date, datetime, timedelta
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        raise ValueError("Укажите часовой пояс")
    return value


AwareDatetime = Annotated[datetime, AfterValidator(_aware)]


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["student", "head"]
    group_name: str | None = Field(default=None, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordForgotIn(BaseModel):
    email: EmailStr


class PasswordResetIn(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    password: str = Field(min_length=8, max_length=128)


class JoinIn(BaseModel):
    code: str = Field(min_length=1, max_length=32)


class GroupUpdateIn(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    timezone: str | None = Field(default=None, max_length=64)


class SubjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    tag: str = Field(default="", max_length=50)
    teacher: str = Field(default="", max_length=200)
    class_links: str = ""
    assessment_type: str = Field(default="", max_length=100)
    passing_criteria: str = ""
    tasks_requirements: str = ""
    notes: str = ""


class SubjectUpdateIn(SubjectIn):
    version: int = Field(ge=1)


class TaskIn(BaseModel):
    subject_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    materials: str = ""
    deadline: AwareDatetime


class TaskUpdateIn(TaskIn):
    version: int = Field(ge=1)


class LessonIn(BaseModel):
    subject_id: int
    task_id: int | None = None
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    classroom: str = Field(default="", max_length=200)
    repeat_biweekly: bool = False
    repeat_until: date | None = None


class LessonUpdateIn(LessonIn):
    version: int = Field(ge=1)


def session_ttl(days: int) -> timedelta:
    return timedelta(days=days)


def reset_ttl(minutes: int) -> timedelta:
    return timedelta(minutes=minutes)
