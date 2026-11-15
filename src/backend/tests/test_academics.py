from datetime import timedelta

from fastapi.testclient import TestClient

from tests.conftest import register


def _head(client: TestClient) -> TestClient:
    register(client, email="head@example.com", role="head", name="Староста")
    return client


def _join(app, email: str, code: str) -> TestClient:
    student = TestClient(app)
    student.__enter__()
    register(student, email=email)
    assert student.post("/groups/join", json={"code": code}).status_code == 204
    return student


def test_subject_conflict_keeps_the_newer_version(client):
    _head(client)
    created = client.post("/subjects", json={"name": "История", "teacher": "Иванова"})
    assert created.status_code == 201
    subject_id = created.json()["id"]
    fresh = client.put(
        f"/subjects/{subject_id}",
        json={"name": "История России", "teacher": "Иванова", "version": 1},
    )
    assert fresh.status_code == 200
    assert fresh.json()["version"] == 2
    stale = client.put(
        f"/subjects/{subject_id}",
        json={"name": "Старое название", "teacher": "Иванова", "version": 1},
    )
    assert stale.status_code == 409
    assert stale.json()["current"]["name"] == "История России"
    assert client.get(f"/subjects/{subject_id}").json()["name"] == "История России"


def test_deleting_subject_removes_lessons_and_tasks(client):
    _head(client)
    subject_id = client.post("/subjects", json={"name": "Физика"}).json()["id"]
    task_id = client.post(
        "/tasks",
        json={
            "subject_id": subject_id,
            "title": "Лабораторная",
            "deadline": "2026-12-01T09:00:00+00:00",
        },
    ).json()["id"]
    lesson_id = client.post(
        "/lessons",
        json={
            "subject_id": subject_id,
            "task_id": task_id,
            "starts_at": "2026-11-20T07:00:00+00:00",
            "ends_at": "2026-11-20T08:30:00+00:00",
            "classroom": "ауд. 201",
        },
    ).json()["id"]
    assert client.delete(f"/subjects/{subject_id}").status_code == 204
    assert client.get(f"/tasks/{task_id}").status_code == 404
    assert client.get(f"/lessons/{lesson_id}").status_code == 404
    assert client.get("/tasks").json() == []


def test_lesson_must_end_after_it_starts(client):
    _head(client)
    subject_id = client.post("/subjects", json={"name": "Химия"}).json()["id"]
    response = client.post(
        "/lessons",
        json={
            "subject_id": subject_id,
            "starts_at": "2026-11-20T10:00:00+00:00",
            "ends_at": "2026-11-20T09:00:00+00:00",
        },
    )
    assert response.status_code == 422
    assert "позже начала" in response.json()["message"]


def test_calendar_shows_lesson_and_deadline_the_same_way(client):
    _head(client)
    code = client.get("/groups/current").json()["invite_code"]
    subject_id = client.post("/subjects", json={"name": "Математика"}).json()["id"]
    deadline = "2026-11-18T15:00:00+00:00"
    client.post(
        "/tasks",
        json={"subject_id": subject_id, "title": "Контрольная", "deadline": deadline},
    )
    client.post(
        "/lessons",
        json={
            "subject_id": subject_id,
            "starts_at": "2026-11-16T06:00:00+00:00",
            "ends_at": "2026-11-16T07:30:00+00:00",
        },
    )
    window = {"from": "2026-11-16T00:00:00+00:00", "to": "2026-11-23T00:00:00+00:00"}
    first = client.get("/calendar", params=window)
    peer = _join(client.app, "peer@example.com", code)
    second = peer.get("/calendar", params=window)
    assert first.status_code == second.status_code == 200
    assert first.json()["deadlines"][0]["deadline"] == second.json()["deadlines"][0]["deadline"]
    assert first.json()["lessons"][0]["subject_name"] == "Математика"
    assert first.json()["deadlines"][0]["title"] == "Контрольная"
    peer.__exit__(None, None, None)


def test_upcoming_deadlines_skip_the_past(client, clock):
    _head(client)
    subject_id = client.post("/subjects", json={"name": "Литература"}).json()["id"]
    soon = (clock.now() + timedelta(days=2)).isoformat()
    past = (clock.now() - timedelta(days=1)).isoformat()
    client.post(
        "/tasks",
        json={"subject_id": subject_id, "title": "Сочинение", "deadline": soon},
    )
    client.post(
        "/tasks",
        json={"subject_id": subject_id, "title": "Прошедшее", "deadline": past},
    )
    titles = [item["title"] for item in client.get("/tasks/upcoming").json()]
    assert titles == ["Сочинение"]


def test_removing_a_member_keeps_their_records_and_deputy_loses_access(client):
    _head(client)
    code = client.get("/groups/current").json()["invite_code"]
    student = _join(client.app, "deputy@example.com", code)
    student_id = student.get("/me").json()["id"]
    assert student.post("/subjects", json={"name": "Нельзя"}).status_code == 403

    assert client.post(f"/groups/members/{student_id}/deputy").status_code == 204
    created = student.post("/subjects", json={"name": "Черчение"})
    assert created.status_code == 201
    subject_id = created.json()["id"]

    assert client.delete(f"/groups/members/{student_id}/deputy").status_code == 204
    assert student.post("/subjects", json={"name": "После снятия"}).status_code == 403
    assert client.get(f"/subjects/{subject_id}").json()["name"] == "Черчение"

    assert client.delete(f"/groups/members/{student_id}").status_code == 204
    assert client.get(f"/subjects/{subject_id}").status_code == 200
    assert student.get("/subjects").status_code == 403
    student.__exit__(None, None, None)


def test_head_updates_timezone_and_lists_members(client):
    _head(client)
    code = client.get("/groups/current").json()["invite_code"]
    student = _join(client.app, "member@example.com", code)
    updated = client.patch("/groups/current", json={"timezone": "Asia/Yekaterinburg"})
    assert updated.status_code == 200
    assert updated.json()["timezone"] == "Asia/Yekaterinburg"
    assert student.get("/groups/current").json()["timezone"] == "Asia/Yekaterinburg"
    assert student.get("/groups/current").json()["invite_code"] is None

    members = client.get("/groups/members")
    assert members.status_code == 200
    roles = {item["email"]: item["role"] for item in members.json()}
    assert roles == {
        "head@example.com": "head",
        "member@example.com": "student",
    }
    assert student.get("/groups/members").status_code == 403
    student.__exit__(None, None, None)
