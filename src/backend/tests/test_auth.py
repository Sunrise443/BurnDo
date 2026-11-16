from fastapi.testclient import TestClient

from tests.conftest import register, reset_token


def test_login_returns_account_and_session_cookie(client):
    head = register(
        client,
        email="head@example.com",
        role="head",
        name="Староста",
        password="password1",
        group_name="БПИ2302",
    )
    assert head.status_code == 201
    invite = client.get("/groups/current").json()["invite_code"]
    assert client.post("/auth/logout").status_code == 204

    registered = register(
        client,
        email="student@example.com",
        name="Иван Иванов",
        password="student12345",
    )
    assert registered.status_code == 201
    joined = client.post("/groups/join", json={"code": invite})
    assert joined.status_code == 204
    assert client.post("/auth/logout").status_code == 204

    response = client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "student12345"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": registered.json()["id"],
        "name": "Иван Иванов",
        "email": "student@example.com",
        "role": "student",
        "group_id": head.json()["group_id"],
        "group_name": "БПИ2302",
        "timezone": "Europe/Moscow",
    }
    set_cookie = response.headers["set-cookie"]
    assert set_cookie.startswith("burndo_session=")
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie
    assert "Max-Age=1209600" in set_cookie
    assert "Path=/" in set_cookie
    assert client.get("/me").json()["email"] == "student@example.com"


def test_login_rejects_wrong_password(client):
    registered = register(
        client,
        email="student@example.com",
        name="Иван Иванов",
        password="student12345",
    )
    assert registered.status_code == 201
    assert client.post("/auth/logout").status_code == 204

    response = client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "wrongpassword"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "code": "authentication",
        "message": "Неверный email или пароль",
    }
    assert "set-cookie" not in response.headers
    assert client.get("/me").status_code == 401


def test_register_head_creates_group_and_student_stays_outside(client):
    head = register(client, email="head@example.com", role="head", name="Староста")
    assert head.status_code == 201
    body = head.json()
    assert body["role"] == "head"
    assert body["group_id"] is not None
    assert body["timezone"] == "Europe/Moscow"

    client.post("/auth/logout")
    student = register(client, email="student@example.com")
    assert student.status_code == 201
    assert student.json()["group_id"] is None
    assert client.get("/subjects").status_code == 403


def test_login_hides_which_field_is_wrong(client):
    register(client, email="user@example.com")
    client.post("/auth/logout")
    unknown = client.post(
        "/auth/login",
        json={"email": "missing@example.com", "password": "password1"},
    )
    wrong = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "wrong-password"},
    )
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["message"] == wrong.json()["message"]


def test_duplicate_email_is_rejected(client):
    register(client, email="same@example.com")
    client.post("/auth/logout")
    again = register(client, email="same@example.com", role="head")
    assert again.status_code == 409
    assert again.json()["code"] == "email_taken"


def test_password_change_and_reset(client, mailer, clock):
    register(client, email="reset@example.com", password="password1")
    changed = client.post(
        "/auth/password/change",
        json={"current_password": "password1", "new_password": "password2"},
    )
    assert changed.status_code == 204
    client.post("/auth/logout")
    old = client.post(
        "/auth/login",
        json={"email": "reset@example.com", "password": "password1"},
    )
    assert old.status_code == 401
    new = client.post(
        "/auth/login",
        json={"email": "reset@example.com", "password": "password2"},
    )
    assert new.status_code == 200

    unknown = client.post("/auth/password/forgot", json={"email": "nobody@example.com"})
    assert unknown.status_code == 204
    assert mailer.messages == []

    sent = client.post("/auth/password/forgot", json={"email": "reset@example.com"})
    assert sent.status_code == 204
    token = reset_token(mailer)
    client.post("/auth/logout")
    reset = client.post(
        "/auth/password/reset",
        json={"token": token, "password": "password3"},
    )
    assert reset.status_code == 204
    reused = client.post(
        "/auth/password/reset",
        json={"token": token, "password": "password4"},
    )
    assert reused.status_code == 422

    client.post(
        "/auth/login",
        json={"email": "reset@example.com", "password": "password3"},
    )
    client.post("/auth/password/forgot", json={"email": "reset@example.com"})
    expired = reset_token(mailer)
    clock.advance(minutes=16)
    rejected = client.post(
        "/auth/password/reset",
        json={"token": expired, "password": "password5"},
    )
    assert rejected.status_code == 422
    assert "устарела" in rejected.json()["message"]


def test_session_expires(client, clock):
    register(client, email="session@example.com")
    clock.advance(days=15)
    assert client.get("/me").status_code == 401


def test_deleted_user_cannot_login_and_head_with_members_cannot_delete(client):
    register(client, email="head@example.com", role="head", name="Староста")
    invite = client.get("/groups/current").json()["invite_code"]
    with TestClient(client.app) as student:
        register(student, email="student@example.com")
        assert student.post("/groups/join", json={"code": invite}).status_code == 204
        blocked = client.delete("/auth/account")
        assert blocked.status_code == 409

        removed = client.delete(f"/groups/members/{student.get('/me').json()['id']}")
        assert removed.status_code == 204
        deleted = client.delete("/auth/account")
        assert deleted.status_code == 204
    denied = client.post(
        "/auth/login",
        json={"email": "head@example.com", "password": "password1"},
    )
    assert denied.status_code == 401


def test_join_isolates_groups_and_invite_can_rotate(client):
    register(client, email="head-a@example.com", role="head", group_name="Группа А")
    code = client.get("/groups/current").json()["invite_code"]
    subject = client.post("/subjects", json={"name": "Алгебра"})
    assert subject.status_code == 201
    subject_id = subject.json()["id"]

    other = TestClient(client.app)
    register(other, email="head-b@example.com", role="head", group_name="Группа Б")
    hidden = other.get(f"/subjects/{subject_id}")
    assert hidden.status_code == 404

    guest = TestClient(client.app)
    register(guest, email="guest@example.com")
    joined = guest.post("/groups/join", json={"code": code})
    assert joined.status_code == 204
    assert guest.get("/subjects").json()[0]["name"] == "Алгебра"
    assert guest.post("/subjects", json={"name": "Чужой"}).status_code == 403

    rotated = client.post("/groups/invites")
    assert rotated.status_code == 200
    new_code = rotated.json()["invite_code"]
    assert new_code != code
    outsider = TestClient(client.app)
    register(outsider, email="late@example.com")
    assert outsider.post("/groups/join", json={"code": code}).status_code == 404
    assert outsider.post("/groups/join", json={"code": new_code}).status_code == 204

    assert guest.post("/groups/leave").status_code == 204
    assert guest.get("/me").json()["group_id"] is None
