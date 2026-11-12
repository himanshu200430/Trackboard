# Tackboard - Unified Startup Script
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Tackboard — Project Management Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Stale PID cleanup
$pidFile = Join-Path $root "pgdata\postmaster.pid"
if (Test-Path $pidFile) {
    try {
        $stalePid = (Get-Content $pidFile)[0].Trim()
        $proc = Get-Process -Id $stalePid -ErrorAction SilentlyContinue
        if (-not $proc) {
            Write-Host "Removing stale postmaster.pid (PID $stalePid)..." -ForegroundColor DarkGray
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

# 2. Ensure PostgreSQL is running on port 5432
Write-Host "`n[1/3] Checking PostgreSQL on port 5432..." -ForegroundColor Yellow
$pgReady = & "C:\Program Files\PostgreSQL\17\bin\pg_isready.exe" -h 127.0.0.1 -p 5432 2>&1
if ($pgReady -match "accepting connections") {
    Write-Host "PostgreSQL is active on port 5432 and accepting connections." -ForegroundColor Green
} else {
    Write-Host "Checking port 5433 fallback..." -ForegroundColor Yellow
    $pgReady5433 = & "C:\Program Files\PostgreSQL\17\bin\pg_isready.exe" -h 127.0.0.1 -p 5433 2>&1
    if ($pgReady5433 -match "accepting connections") {
        Write-Host "PostgreSQL is active on port 5433." -ForegroundColor Green
    } else {
        Write-Host "Starting PostgreSQL cluster..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "& 'C:\Program Files\PostgreSQL\17\bin\postgres.exe' -D '$root\pgdata' -p 5433" -WindowStyle Minimized
        Start-Sleep -Seconds 3
    }
}

# 3. Start Backend Server
Write-Host "`n[2/3] Starting Express Backend (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; Write-Host 'Starting Tackboard Backend...' -ForegroundColor Cyan; node src/server.js" -WindowStyle Normal

Start-Sleep -Seconds 2

# 4. Start Frontend Client
Write-Host "`n[3/3] Starting React Vite Client (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\client'; Write-Host 'Starting Tackboard Frontend...' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# 5. Open browser
Start-Process "http://localhost:5173"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " Tackboard is running!" -ForegroundColor Green
Write-Host " Client:  http://localhost:5173" -ForegroundColor White
Write-Host " API:     http://localhost:5000" -ForegroundColor White
Write-Host "`n Demo Accounts Available on Login Screen:" -ForegroundColor Yellow
Write-Host "  - Alex (Owner):   alex@tackboard.dev   / password123"
Write-Host "  - Sam (Member):   sam@tackboard.dev    / password123"
Write-Host "  - Jordan (Viewer):jordan@tackboard.dev / password123"
Write-Host "==========================================" -ForegroundColor Green
