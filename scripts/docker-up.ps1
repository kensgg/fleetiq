<#
.SYNOPSIS
  Wrapper de Docker Compose para FleetIQ.
  Pasa --env-file .env.local automaticamente para que los build args
  (NEXT_PUBLIC_*) se resuelvan correctamente.

.USAGE
  .\scripts\docker-up.ps1            # build + levantar
  .\scripts\docker-up.ps1 -Down      # detener y eliminar contenedores
  .\scripts\docker-up.ps1 -Logs      # ver logs en vivo
#>

param(
    [switch]$Down,
    [switch]$Logs
)

$envFile = Join-Path $PSScriptRoot "..\\.env.local"
$composeArgs = "--env-file `"$envFile`""

if ($Down) {
    Write-Host "[>>] Deteniendo contenedores..." -ForegroundColor Yellow
    Invoke-Expression "docker compose $composeArgs down"
}
elseif ($Logs) {
    Write-Host "[>>] Mostrando logs (Ctrl+C para salir)..." -ForegroundColor Cyan
    Invoke-Expression "docker compose $composeArgs logs -f"
}
else {
    Write-Host "[>>] Construyendo y levantando FleetIQ..." -ForegroundColor Cyan
    Invoke-Expression "docker compose $composeArgs up --build"
}
