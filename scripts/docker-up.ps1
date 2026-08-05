<#
.SYNOPSIS
  Wrapper de Docker Compose para FleetIQ.
  Pasa --env-file automáticamente para que los build args
  (NEXT_PUBLIC_*) se resuelvan correctamente.

.USAGE
  .\scripts\docker-up.ps1              # build + levantar (local)
  .\scripts\docker-up.ps1 -Down        # detener y eliminar contenedores
  .\scripts\docker-up.ps1 -Logs        # ver logs en vivo
  .\scripts\docker-up.ps1 -Prod        # usar compose de producción
  .\scripts\docker-up.ps1 -Prod -Down  # bajar contenedores de producción
#>

param(
    [switch]$Down,
    [switch]$Logs,
    [switch]$Prod    # Usa docker-compose.prod.yml + .env.production
)

$rootDir = Join-Path $PSScriptRoot ".."

if ($Prod) {
    $envFile     = Join-Path $rootDir ".env.production"
    $composeFile = Join-Path $rootDir "docker-compose.prod.yml"

    if (-not (Test-Path $envFile)) {
        Write-Error "[ERROR] No se encontró .env.production. Copia .env.production.example y rellena los valores."
        exit 1
    }
} else {
    $envFile     = Join-Path $rootDir ".env.local"
    $composeFile = Join-Path $rootDir "docker-compose.yml"

    if (-not (Test-Path $envFile)) {
        Write-Error "[ERROR] No se encontró .env.local."
        exit 1
    }
}

$composeArgs = "-f `"$composeFile`" --env-file `"$envFile`""

if ($Down) {
    Write-Host "[>>] Deteniendo contenedores..." -ForegroundColor Yellow
    Invoke-Expression "docker compose $composeArgs down"
}
elseif ($Logs) {
    Write-Host "[>>] Mostrando logs (Ctrl+C para salir)..." -ForegroundColor Cyan
    Invoke-Expression "docker compose $composeArgs logs -f"
}
else {
    $mode = if ($Prod) { "PRODUCCIÓN" } else { "LOCAL" }
    Write-Host "[>>] Construyendo y levantando FleetIQ ($mode)..." -ForegroundColor Cyan
    Invoke-Expression "docker compose $composeArgs up --build -d"

    Write-Host ""
    Write-Host "[>>] Verificando estado de contenedores..." -ForegroundColor Cyan
    Invoke-Expression "docker compose $composeArgs ps"

    if (-not $Prod) {
        Write-Host ""
        Write-Host "[OK] App disponible en: https://localhost" -ForegroundColor Green
        Write-Host "     (asegúrate de haber ejecutado scripts\gen-certs.ps1 primero)" -ForegroundColor Gray
    }
}
