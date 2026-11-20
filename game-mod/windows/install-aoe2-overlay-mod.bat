@echo off
rem Installs the "AoE2 Overlay Mod" into Age of Empires II: DE on this PC.
rem Double-click it with the game closed. It finds the game's mods folder, sends
rem the list of your mods and your resource bar layout to the Mac that serves this
rem file (which builds the mod for your setup), installs the mod and turns it on
rem first in your mod list (the previous list is kept as mod-status.json.bak).
rem The PowerShell part is at the end, after its marker line.
title AoE2 Overlay Mod installer
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[IO.File]::ReadAllText('%~f0'); $i=$s.IndexOf('#'+'PS1'); iex $s.Substring($i)"
echo.
pause
exit /b

#PS1
$ErrorActionPreference = 'Stop'
$Server = '__SERVER__'
$ModTitle = 'AoE2 Overlay Mod'
$log = New-Object System.Collections.Generic.List[string]
function Say($m) { Write-Host $m; $log.Add([string]$m) }
function Send-Log($ok) {
    try {
        $body = [pscustomobject]@{ ok = $ok; log = @($log) } | ConvertTo-Json -Depth 4
        Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$Server/log" -Body ([Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'application/json; charset=utf-8' | Out-Null
    } catch {}
}

try {
    if (Get-Process -Name 'AoE2DE_s', 'AoE2DE' -ErrorAction SilentlyContinue) {
        throw 'Close Age of Empires II first, then run this again.'
    }

    # The profile's mods folder: %USERPROFILE%\Games\Age of Empires 2 DE\<id>\mods
    $statusFiles = @(Get-ChildItem -Path (Join-Path $env:USERPROFILE 'Games\Age of Empires 2 DE\*\mods\mod-status.json') -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    if ($statusFiles.Count -eq 0) {
        throw "Didn't find the game's mods folder (Games\Age of Empires 2 DE\<id>\mods in your user folder). Start the game once, close it and try again."
    }
    $statusFile = $statusFiles[0].FullName
    $mods = Split-Path $statusFile
    Say "Mods folder: $mods"

    # The game's folder, through Steam (only to report it, and for its default layout)
    $roots = @()
    $reg = Get-ItemProperty -Path 'HKCU:\Software\Valve\Steam' -ErrorAction SilentlyContinue
    if ($reg -and $reg.SteamPath) { $roots += ($reg.SteamPath -replace '/', '\') }
    $roots += 'C:\Program Files (x86)\Steam', 'C:\Program Files\Steam'
    $libs = @()
    foreach ($r in $roots) {
        $libs += $r
        $vdf = Join-Path $r 'steamapps\libraryfolders.vdf'
        if (Test-Path $vdf) {
            foreach ($m in [regex]::Matches((Get-Content -Raw $vdf), '"path"\s+"([^"]+)"')) { $libs += ($m.Groups[1].Value -replace '\\\\', '\') }
        }
    }
    $game = $null
    foreach ($l in ($libs | Select-Object -Unique)) {
        $g = Join-Path $l 'steamapps\common\AoE2DE'
        if (Test-Path (Join-Path $g 'widgetui')) { $game = $g; break }
    }
    if ($game) { Say "Game: $game" } else { Say 'Game folder not found through Steam (the mod works anyway).' }

    # Your mods, and the resource bar layout in use: the highest enabled mod that has one, else the game's
    $status = Get-Content -Raw -Encoding UTF8 $statusFile | ConvertFrom-Json
    $modsInfo = @()
    $layoutFile = $null
    $layoutFrom = 'the game'
    foreach ($m in @($status.Mods | Sort-Object { [int]$_.Priority })) {
        if ($m.Path -eq "local//$ModTitle") { continue }
        $dir = Join-Path $mods ($m.Path -replace '//', '\')
        $rp = Join-Path $dir 'widgetui\resourcepanel.json'
        $hasRp = Test-Path $rp
        $hasMap = [bool](Get-ChildItem -Path (Join-Path $dir 'widgetui\textures\ingame\panels') -Filter 'map-panel.png' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1)
        $modsInfo += [pscustomobject]@{ title = $m.Title; path = $m.Path; enabled = [bool]$m.Enabled; priority = $m.Priority; resourcePanel = $hasRp; mapPanel = $hasMap }
        if ($m.Enabled -and $hasRp -and -not $layoutFile) { $layoutFile = $rp; $layoutFrom = $m.Title }
    }
    if (-not $layoutFile -and $game) { $layoutFile = Join-Path $game 'widgetui\resourcepanel.json' }
    Say "Resource bar layout from: $layoutFrom"

    Add-Type -AssemblyName System.Windows.Forms
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $report = [pscustomobject]@{
        computer      = $env:COMPUTERNAME
        windows       = [Environment]::OSVersion.VersionString
        screen        = "$($screen.Width)x$($screen.Height)"
        game          = $game
        mods          = $mods
        layoutFrom    = $layoutFrom
        installedMods = $modsInfo
    }
    $layoutText = $null
    if ($layoutFile -and (Test-Path $layoutFile)) { $layoutText = [IO.File]::ReadAllText($layoutFile) }
    $body = [pscustomobject]@{ report = $report; panelLayout = $layoutText } | ConvertTo-Json -Depth 6

    Say 'Building the mod on the Mac for this PC...'
    $zip = Join-Path $env:TEMP 'aoe2-overlay-mod.zip'
    Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$Server/build" -Body ([Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'application/json; charset=utf-8' -OutFile $zip

    $dest = Join-Path $mods "local\$ModTitle"
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Expand-Archive -Path $zip -DestinationPath $dest -Force
    # Where the overlay sends what it reads, to check it (its "Send to the Mac" button)
    [IO.File]::WriteAllText((Join-Path $dest 'overlay-dev-server.txt'), $Server)
    Say "Installed: $dest"

    # On, and first in the list so its files win over other mods'
    Copy-Item $statusFile "$statusFile.bak" -Force
    $path = "local//$ModTitle"
    $others = @($status.Mods | Where-Object { $_.Path -ne $path } | Sort-Object { [int]$_.Priority })
    $i = 2
    foreach ($m in $others) { $m.Priority = $i; $i++ }
    $ours = [pscustomobject]@{ CheckSum = '0'; Enabled = $true; LastUpdate = '0'; Path = $path; Priority = 1; PublishID = 0; Title = $ModTitle; WorkshopID = 0 }
    $status.Mods = @($ours) + $others
    [IO.File]::WriteAllText($statusFile, ($status | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
    Say 'Turned on, first in your mod list (the previous list is saved as mod-status.json.bak).'

    # The overlay too, if the Mac has a build of it: one .exe, put where its
    # installer would put it (so it replaces an installed one), with a Start menu
    # shortcut, and started
    $download = Join-Path $env:TEMP 'aoe2-civs-overlay.exe'
    $haveOverlay = $true
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "$Server/overlay/latest.exe" -OutFile $download
    } catch {
        $haveOverlay = $false
        Say 'No overlay build on the Mac right now: only the mod was installed.'
    }
    if ($haveOverlay) {
        Get-Process -Name 'aoe2-civs-overlay' -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Milliseconds 500
        $dir = Join-Path $env:LOCALAPPDATA 'AoE2 Civs Overlay'
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        $exe = Join-Path $dir 'aoe2-civs-overlay.exe'
        Copy-Item $download $exe -Force
        $lnk = Join-Path ([Environment]::GetFolderPath('Programs')) 'AoE2 Civs Overlay.lnk'
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($lnk)
        $shortcut.TargetPath = $exe
        $shortcut.Save()
        Start-Process -FilePath $exe
        Say "Overlay installed and started ($exe). Show or hide it with Ctrl+Alt+``."
    }
    Say 'Done. Start the game and play a 1v1 Arabia.'
    Send-Log $true
} catch {
    Say ("Couldn't finish: " + $_.Exception.Message)
    Send-Log $false
}
