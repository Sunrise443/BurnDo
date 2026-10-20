# BurnDo

Планировщик учёбы и дедлайнов для учебной группы.

## Стек

- Frontend: TypeScript, React, Vite. Архитектура — Feature-Sliced Design, код в `src/frontend/src`.
- Backend: Python 3.14.5, FastAPI, код в `src/backend`. Версия зафиксирована в `.python-version`.
- База данных: PostgreSQL.

Слои фронтенда, которые уже есть: `app`, `pages`, `shared`. Слои `widgets`, `features` и `entities` добавляются вместе с первой функциональностью, которой они нужны.

## Запуск всего окружения

Нужен Docker.

```bash
docker compose up --build
```

- Приложение: http://localhost:5173
- Тестовый ответ API: http://localhost:8000/
- Проверка PostgreSQL: http://localhost:8000/health

Остановка: `docker compose down`.

Логин, пароль и имя базы для локального Postgres: `burndo` / `burndo` / `burndo`. Это только значения для разработки.

## Локальный запуск

PostgreSQL:

```bash
docker compose up -d postgres
```

Backend из `src/backend`:

```bash
python -m venv .venv
```

Windows (PowerShell):

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

macOS и Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend из `src/frontend`:

```bash
npm install
npm run dev
```

Параметры по умолчанию совпадают с `docker compose`. Их можно переопределить в `src/backend/.env`, образец лежит в `src/backend/.env.example`.
