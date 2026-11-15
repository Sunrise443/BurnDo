from fastapi import APIRouter, Depends, Query, Request, Response

from app.application import auth, groups, lessons, subjects, tasks
from app.domain.roles import Role
from app.presentation.api.deps import (
    Services,
    clear_session_cookie,
    get_services,
    set_session_cookie,
)
from app.presentation.api.schemas import (
    GroupUpdateIn,
    JoinIn,
    LessonIn,
    LessonUpdateIn,
    LoginIn,
    PasswordChangeIn,
    PasswordForgotIn,
    PasswordResetIn,
    RegisterIn,
    SubjectIn,
    SubjectUpdateIn,
    TaskIn,
    TaskUpdateIn,
    reset_ttl,
    session_ttl,
)
from app.presentation.api.serialize import (
    account_payload,
    group_payload,
    lesson_view_payload,
    member_payload,
    subject_payload,
    task_view_payload,
)

router = APIRouter()


def _actor(services: Services, request: Request):
    raw_token = request.cookies.get(services.settings.cookie_name)
    return auth.authenticate(services.uow, services.clock, raw_token)


def _account(services: Services, raw_token: str) -> dict[str, object]:
    actor = auth.authenticate(services.uow, services.clock, raw_token)
    return account_payload(auth.account_for(services.uow, actor.user_id))


@router.post("/auth/register", status_code=201)
def register(
    body: RegisterIn,
    response: Response,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    raw_token = auth.register_user(
        services.uow,
        services.hasher,
        services.tokens,
        services.clock,
        name=body.name,
        email=str(body.email),
        password=body.password,
        role=Role(body.role),
        group_name=body.group_name or "",
        session_ttl=session_ttl(services.settings.session_ttl_days),
        default_timezone=services.settings.default_timezone,
    )
    set_session_cookie(response, services.settings, raw_token)
    return _account(services, raw_token)


@router.post("/auth/login")
def login(
    body: LoginIn,
    response: Response,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    raw_token = auth.login(
        services.uow,
        services.hasher,
        services.tokens,
        services.clock,
        email=str(body.email),
        password=body.password,
        session_ttl=session_ttl(services.settings.session_ttl_days),
    )
    set_session_cookie(response, services.settings, raw_token)
    return _account(services, raw_token)


@router.post("/auth/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    services: Services = Depends(get_services),
) -> Response:
    auth.logout(services.uow, request.cookies.get(services.settings.cookie_name))
    clear_session_cookie(response, services.settings)
    response.status_code = 204
    return response


@router.get("/me")
def me(request: Request, services: Services = Depends(get_services)) -> dict[str, object]:
    actor = _actor(services, request)
    return account_payload(auth.account_for(services.uow, actor.user_id))


@router.post("/auth/password/change", status_code=204)
def change_password(
    body: PasswordChangeIn,
    request: Request,
    services: Services = Depends(get_services),
) -> Response:
    auth.change_password(
        services.uow,
        services.hasher,
        _actor(services, request),
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return Response(status_code=204)


@router.post("/auth/password/forgot", status_code=204)
def forgot_password(
    body: PasswordForgotIn,
    services: Services = Depends(get_services),
) -> Response:
    auth.request_password_reset(
        services.uow,
        services.tokens,
        services.clock,
        services.mailer,
        email=str(body.email),
        reset_ttl=reset_ttl(services.settings.password_reset_ttl_minutes),
        frontend_origin=services.settings.frontend_origin,
    )
    return Response(status_code=204)


@router.post("/auth/password/reset", status_code=204)
def reset_password(
    body: PasswordResetIn,
    services: Services = Depends(get_services),
) -> Response:
    auth.reset_password(
        services.uow,
        services.hasher,
        services.clock,
        token=body.token,
        new_password=body.password,
    )
    return Response(status_code=204)


@router.delete("/auth/account", status_code=204)
def delete_account(
    request: Request,
    response: Response,
    services: Services = Depends(get_services),
) -> Response:
    auth.delete_account(services.uow, services.clock, _actor(services, request))
    clear_session_cookie(response, services.settings)
    response.status_code = 204
    return response


@router.get("/groups/current")
def current_group(
    request: Request, services: Services = Depends(get_services)
) -> dict[str, object]:
    return group_payload(groups.current_group(services.uow, _actor(services, request)))


@router.patch("/groups/current")
def update_group(
    body: GroupUpdateIn,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    return group_payload(
        groups.update_group(
            services.uow,
            _actor(services, request),
            name=body.name,
            timezone=body.timezone,
        )
    )


@router.post("/groups/invites")
def rotate_invite(
    request: Request, services: Services = Depends(get_services)
) -> dict[str, object]:
    return group_payload(
        groups.rotate_invite(services.uow, services.tokens, _actor(services, request))
    )


@router.post("/groups/join", status_code=204)
def join_group(
    body: JoinIn,
    request: Request,
    services: Services = Depends(get_services),
) -> Response:
    groups.join_group(services.uow, _actor(services, request), body.code)
    return Response(status_code=204)


@router.post("/groups/leave", status_code=204)
def leave_group(request: Request, services: Services = Depends(get_services)) -> Response:
    groups.leave_group(services.uow, _actor(services, request))
    return Response(status_code=204)


@router.get("/groups/members")
def list_members(request: Request, services: Services = Depends(get_services)) -> list[dict]:
    actor = _actor(services, request)
    return [member_payload(item) for item in groups.list_members(services.uow, actor)]


@router.delete("/groups/members/{user_id}", status_code=204)
def remove_member(
    user_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> Response:
    groups.remove_member(services.uow, _actor(services, request), user_id)
    return Response(status_code=204)


@router.post("/groups/members/{user_id}/deputy", status_code=204)
def assign_deputy(
    user_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> Response:
    groups.assign_deputy(services.uow, _actor(services, request), user_id)
    return Response(status_code=204)


@router.delete("/groups/members/{user_id}/deputy", status_code=204)
def unassign_deputy(
    user_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> Response:
    groups.unassign_deputy(services.uow, _actor(services, request), user_id)
    return Response(status_code=204)


@router.get("/subjects")
def list_subjects(request: Request, services: Services = Depends(get_services)) -> list[dict]:
    actor = _actor(services, request)
    return [subject_payload(item) for item in subjects.list_subjects(services.uow, actor)]


@router.post("/subjects", status_code=201)
def create_subject(
    body: SubjectIn,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    subject = subjects.create_subject(
        services.uow,
        _actor(services, request),
        name=body.name,
        tag=body.tag,
        teacher=body.teacher,
        class_links=body.class_links,
        assessment_type=body.assessment_type,
        passing_criteria=body.passing_criteria,
        tasks_requirements=body.tasks_requirements,
        notes=body.notes,
    )
    return subject_payload(subject)


@router.get("/subjects/{subject_id}")
def get_subject(
    subject_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    return subject_payload(
        subjects.get_subject(services.uow, _actor(services, request), subject_id)
    )


@router.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    body: SubjectUpdateIn,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    subject = subjects.update_subject(
        services.uow,
        _actor(services, request),
        subject_id,
        version=body.version,
        name=body.name,
        tag=body.tag,
        teacher=body.teacher,
        class_links=body.class_links,
        assessment_type=body.assessment_type,
        passing_criteria=body.passing_criteria,
        tasks_requirements=body.tasks_requirements,
        notes=body.notes,
    )
    return subject_payload(subject)


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(
    subject_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> Response:
    subjects.delete_subject(services.uow, _actor(services, request), subject_id)
    return Response(status_code=204)


@router.get("/tasks/upcoming")
def upcoming_tasks(request: Request, services: Services = Depends(get_services)) -> list[dict]:
    actor = _actor(services, request)
    return [
        task_view_payload(item) for item in tasks.list_upcoming(services.uow, services.clock, actor)
    ]


@router.get("/tasks")
def list_tasks(
    request: Request,
    subject_id: int | None = None,
    services: Services = Depends(get_services),
) -> list[dict]:
    actor = _actor(services, request)
    return [task_view_payload(item) for item in tasks.list_tasks(services.uow, actor, subject_id)]


@router.post("/tasks", status_code=201)
def create_task(
    body: TaskIn,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    view = tasks.create_task(
        services.uow,
        _actor(services, request),
        subject_id=body.subject_id,
        title=body.title,
        description=body.description,
        materials=body.materials,
        deadline=body.deadline,
    )
    return task_view_payload(view)


@router.get("/tasks/{task_id}")
def get_task(
    task_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    return task_view_payload(tasks.get_task(services.uow, _actor(services, request), task_id))


@router.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    body: TaskUpdateIn,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    view = tasks.update_task(
        services.uow,
        _actor(services, request),
        task_id,
        version=body.version,
        subject_id=body.subject_id,
        title=body.title,
        description=body.description,
        materials=body.materials,
        deadline=body.deadline,
    )
    return task_view_payload(view)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> Response:
    tasks.delete_task(services.uow, _actor(services, request), task_id)
    return Response(status_code=204)


@router.get("/lessons")
def list_lessons(
    request: Request,
    subject_id: int | None = None,
    services: Services = Depends(get_services),
) -> list[dict]:
    actor = _actor(services, request)
    return [
        lesson_view_payload(item) for item in lessons.list_lessons(services.uow, actor, subject_id)
    ]


@router.post("/lessons", status_code=201)
def create_lesson(
    body: LessonIn,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    view = lessons.create_lesson(
        services.uow,
        _actor(services, request),
        subject_id=body.subject_id,
        task_id=body.task_id,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        classroom=body.classroom,
    )
    return lesson_view_payload(view)


@router.get("/lessons/{lesson_id}")
def get_lesson(
    lesson_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    return lesson_view_payload(
        lessons.get_lesson(services.uow, _actor(services, request), lesson_id)
    )


@router.put("/lessons/{lesson_id}")
def update_lesson(
    lesson_id: int,
    body: LessonUpdateIn,
    request: Request,
    services: Services = Depends(get_services),
) -> dict[str, object]:
    view = lessons.update_lesson(
        services.uow,
        _actor(services, request),
        lesson_id,
        version=body.version,
        subject_id=body.subject_id,
        task_id=body.task_id,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        classroom=body.classroom,
    )
    return lesson_view_payload(view)


@router.delete("/lessons/{lesson_id}", status_code=204)
def delete_lesson(
    lesson_id: int,
    request: Request,
    services: Services = Depends(get_services),
) -> Response:
    lessons.delete_lesson(services.uow, _actor(services, request), lesson_id)
    return Response(status_code=204)


@router.get("/calendar")
def calendar(
    request: Request,
    services: Services = Depends(get_services),
    start: str = Query(alias="from"),
    end: str = Query(alias="to"),
) -> dict[str, object]:
    window_start = _parse_moment(start)
    window_end = _parse_moment(end)
    view = lessons.calendar(services.uow, _actor(services, request), window_start, window_end)
    return {
        "lessons": [lesson_view_payload(item) for item in view.lessons],
        "deadlines": [task_view_payload(item) for item in view.deadlines],
    }


def _parse_moment(value: str):
    from datetime import datetime

    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        from app.domain.errors import ValidationError

        raise ValidationError("Укажите дату и время со смещением")
    return parsed
