def test_root_and_health(client):
    root = client.get("/")
    assert root.status_code == 200
    assert root.json() == {"message": "BurnDo API is running"}

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "database": "connected"}
