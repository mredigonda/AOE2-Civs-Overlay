Write-Host "Testing AOE2 Civs Overlay Windows Build" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

$exePath = "dist\AOE2 Civs Overlay.exe"

if (Test-Path $exePath) {
    Write-Host "Found executable: $exePath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Running executable..." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Green
    
    try {
        # Run the executable and capture output
        $process = Start-Process -FilePath $exePath -PassThru -NoNewWindow -Wait
        Write-Host "Process exited with code: $($process.ExitCode)" -ForegroundColor Cyan
    }
    catch {
        Write-Host "Error running executable: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Executable finished running." -ForegroundColor Green
} else {
    Write-Host "ERROR: Executable not found at $exePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available files in dist\:" -ForegroundColor Yellow
    if (Test-Path "dist") {
        Get-ChildItem "dist" | Format-Table Name, Length, LastWriteTime
    } else {
        Write-Host "dist\ directory does not exist" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
