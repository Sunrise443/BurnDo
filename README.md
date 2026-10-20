# BurnDo

Планировщик учёбы и дедлайнов для учебной группы.

## Запуск

### Запуск всего окружения

Для полного запуска нужен Docker

```bash
docker compose up --build
```

- Приложение: http://localhost:5173
- Тестовый ответ API: http://localhost:8000/
- Проверка PostgreSQL: http://localhost:8000/health

Остановка: `docker compose down`.

### Локальный запуск

PostgreSQL:

```bash
docker compose up -d postgres
```

Backend из `src/backend`:

```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend из `src/frontend`:

```bash
npm ci
npm run dev
```
