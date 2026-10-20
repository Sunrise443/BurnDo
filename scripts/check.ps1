# проверка приложения после запуска: API, база данных, страница.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Invoke-WhenReady {
    param([string]$Url)

    for ($attempt = 1; $attempt -le 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                return $response
            }
        }
        catch {
            Write-Host "  ждём $Url ($attempt/30)"
        }

        Start-Sleep -Seconds 2
    }

    throw "Сервис не ответил: $Url"
}

Write-Host "1. API запущен"
$api = Invoke-WhenReady "http://localhost:8000/"
$message = ($api.Content | ConvertFrom-Json).message
if ($message -ne "BurnDo API is running") {
    throw "API ответил иначе: $($api.Content)"
}
Write-Host "  ОК: $($api.Content)"

Write-Host "2. База подключена"
$health = Invoke-WhenReady "http://localhost:8000/health"
$healthBody = $health.Content | ConvertFrom-Json
if ($healthBody.status -ne "ok" -or $healthBody.database -ne "connected") {
    throw "База не подключена: $($health.Content)"
}
Write-Host "  ОК: $($health.Content)"

Write-Host "3. Интерфейс открывается"
$page = Invoke-WhenReady "http://localhost:5173/"
if ($page.Content -notmatch "BurnDo") {
    throw "Страница не готова"
}
Write-Host "  ОК: страница готова"

Write-Host "Проверка успешно завершена"
