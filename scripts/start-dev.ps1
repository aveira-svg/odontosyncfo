# Reinicia el servidor de desarrollo (Windows)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Deteniendo procesos en el puerto 3000..."
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object {
    if ($_.OwningProcess -gt 0) {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }

Start-Sleep -Seconds 2

foreach ($cache in @(".next", ".next-dev", "node_modules\.cache\dental-next")) {
  if (Test-Path $cache) {
    Write-Host "Eliminando cache $cache..."
    Remove-Item -Recurse -Force $cache -ErrorAction SilentlyContinue
  }
}

$env:WATCHPACK_POLLING = "true"
$env:CHOKIDAR_USEPOLLING = "true"

Write-Host "Iniciando Next.js en http://127.0.0.1:3000 ..."
npm run dev
