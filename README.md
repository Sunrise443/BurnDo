# BurnDo

Планировщик учёбы и дедлайнов для учебной группы.

## Запуск из чистого clone

### Предварительные требования

- Git
- Docker Engine и Docker Compose V2 (команда `docker compose`)

Версии окружения зафиксированы в образах и на хост отдельно не ставятся:

- Python 3.14.5
- Node.js 22.23.3, npm 10.9.9
- PostgreSQL 16.14

### Установка зависимостей

Зависимости ставятся внутри образов при сборке:

```bash
docker compose build
```

Backend получает пакеты из `src/backend/requirements.txt`. Frontend ставит пакеты командой `npm ci` по `src/frontend/package-lock.json`.

### Запуск

```bash
git clone https://github.com/Sunrise443/BurnDo.git
cd BurnDo
docker compose build
docker compose up -d
```

Поднимаются PostgreSQL, API и интерфейс.

- Приложение: http://localhost:5173
- API: http://localhost:8000/

Логи: `docker compose logs -f`. Остановка: `docker compose down`.

### Проверка работоспособности

Сценарий из трёх шагов. Скрипт ждёт, пока сервисы поднимутся, и завершается с кодом 0, только если прошли все шаги.

1. API запущен: `GET http://localhost:8000/` возвращает `{"message":"BurnDo API is running"}`.
2. База подключена: `GET http://localhost:8000/health` возвращает HTTP 200 и `{"status":"ok","database":"connected"}`.
3. Интерфейс открывается: `GET http://localhost:5173/` возвращает страницу BurnDo.

```powershell
.\scripts\check.ps1
```

### Локальный запуск

Нужны Python 3.14.5, Node.js 22.23.3 и npm 10.9.9. Нужен для разработки без сборки образов приложения.

PostgreSQL:

```bash
docker compose up -d postgres
```

Backend из `src/backend`. Файл `.env` пока что необязателен: значения по умолчанию совпадают с `src/backend/.env.example`.

```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend из `src/frontend`:

```bash
npm ci
npm run dev
```

Проверка та же: `.\scripts\check.ps1`.

## Проверка запуска по инструкции от 20.10.2026, Кашкаровой Ариной, ОС: Windows 11
1. Сборка докера:
```bash
$ docker compose build
[+] Building 35.9s (25/25) FINISHED  
 . . .
[+] build 2/2
 ✔ Image burndo-backend  Built                                                                                                                                            36.1s
 ✔ Image burndo-frontend Built  
```
2. Запуск проекта:
```bash
$ docker compose up -d
[+] up 19/19
 ✔ Image postgres:16.14-alpine Pulled                                                                                                                                     13.9s
 ✔ Volume burndo_postgres_data Created                                                                                                                                     0.0s
 ✔ Network burndo_default      Created                                                                                                                                     0.0s
 ✔ Container burndo-postgres-1 Healthy                                                                                                                                     9.8s
 ✔ Container burndo-backend-1  Started                                                                                                                                     6.3s
 ✔ Container burndo-frontend-1 Started
```
3. Запуск скрипта на проверку работоспособности:
```bash
$ powershell.exe -ExecutionPolicy Bypass -File ./scripts/check.ps1
1. API запущен
  ОК: {"message":"BurnDo API is running"}
2. База подключена
  ОК: {"status":"ok","database":"connected"}
3. Интерфейс открывается
  ОК: страница готова
Проверка успешно завершена
```