<#
.SYNOPSIS
  Genera certificados SSL locales con mkcert para FleetIQ.
  Ejecutar una sola vez (o cuando quieras renovarlos).

.USAGE
  .\scripts\gen-certs.ps1
#>

$ErrorActionPreference = "Stop"

$certsDir = Join-Path $PSScriptRoot "..\nginx\certs"

# Crear carpeta si no existe
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
    Write-Host "[OK] Carpeta creada: $certsDir" -ForegroundColor Cyan
}

# Verificar que mkcert este instalado
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Error "[ERROR] mkcert no esta instalado. Instalalo con: winget install FiloSottile.mkcert"
    exit 1
}

Write-Host "[...] Instalando CA raiz de mkcert..." -ForegroundColor Yellow
mkcert -install

Write-Host "[...] Generando certificados para localhost..." -ForegroundColor Yellow

# Cambiar al directorio de certs para que los archivos se generen ahi
Push-Location $certsDir
try {
    mkcert -cert-file cert.pem -key-file key.pem localhost 127.0.0.1 "::1"
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "[OK] Certificados generados en: $certsDir" -ForegroundColor Green
Write-Host "     cert.pem -> certificado publico"       -ForegroundColor Green
Write-Host "     key.pem  -> clave privada"             -ForegroundColor Green
Write-Host ""
Write-Host "[>>] Ahora puedes correr: docker compose up --build" -ForegroundColor Cyan
