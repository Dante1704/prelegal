Set-Location (Split-Path $PSScriptRoot -Parent)
docker compose up --build -d
Write-Host "Prelegal running at http://localhost:8000"
