Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Cleanup on exit ─────────────────────────────────────────────────────────────
$global:BackendJob  = $null
$global:FrontendJob = $null
$global:Timer       = $null

function Stop-All {
    if ($global:Timer) { $global:Timer.Stop() }
    if ($global:BackendJob)  { Stop-Job $global:BackendJob  -ErrorAction SilentlyContinue; Remove-Job $global:BackendJob  -ErrorAction SilentlyContinue }
    if ($global:FrontendJob) { Stop-Job $global:FrontendJob -ErrorAction SilentlyContinue; Remove-Job $global:FrontendJob -ErrorAction SilentlyContinue }
    # Kill any leftover processes
    Get-Process python, node, uvicorn -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# ── GUI ─────────────────────────────────────────────────────────────────────────
$form = New-Object System.Windows.Forms.Form
$form.Text            = "StudentOS Launcher"
$form.Size            = New-Object System.Drawing.Size(620, 540)
$form.StartPosition   = "CenterScreen"
$form.BackColor       = [System.Drawing.Color]::FromArgb(15, 15, 30)
$form.ForeColor       = [System.Drawing.Color]::White
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox     = $false
$form.Font            = New-Object System.Drawing.Font("Segoe UI", 10)

# Title
$title = New-Object System.Windows.Forms.Label
$title.Text      = "🎓 StudentOS"
$title.Font      = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::FromArgb(108, 99, 255)
$title.Location  = New-Object System.Drawing.Point(20, 18)
$title.Size      = New-Object System.Drawing.Size(400, 45)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text      = "AI-Powered Student Operating System"
$subtitle.Font      = New-Object System.Drawing.Font("Segoe UI", 10)
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 200)
$subtitle.Location  = New-Object System.Drawing.Point(22, 62)
$subtitle.Size      = New-Object System.Drawing.Size(400, 22)
$form.Controls.Add($subtitle)

# Separator
$sep = New-Object System.Windows.Forms.Label
$sep.BackColor = [System.Drawing.Color]::FromArgb(40, 40, 70)
$sep.Location  = New-Object System.Drawing.Point(20, 92)
$sep.Size      = New-Object System.Drawing.Size(570, 2)
$form.Controls.Add($sep)

# Status panel
function New-StatusRow($y, $labelText) {
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text      = $labelText
    $lbl.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 200)
    $lbl.Location  = New-Object System.Drawing.Point(25, $y)
    $lbl.Size      = New-Object System.Drawing.Size(160, 24)
    $form.Controls.Add($lbl)

    $dot = New-Object System.Windows.Forms.Label
    $dot.Text      = "⏸ Stopped"
    $dot.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 150)
    $dot.Location  = New-Object System.Drawing.Point(190, $y)
    $dot.Size      = New-Object System.Drawing.Size(160, 24)
    $form.Controls.Add($dot)
    return $dot
}

$lblBackend  = New-StatusRow 110 "Backend (FastAPI)"
$lblFrontend = New-StatusRow 140 "Frontend (Vite)"
$lblHealth   = New-StatusRow 170 "Health Check"

# Log box
$logBox = New-Object System.Windows.Forms.RichTextBox
$logBox.Location    = New-Object System.Drawing.Point(20, 210)
$logBox.Size        = New-Object System.Drawing.Size(570, 210)
$logBox.BackColor   = [System.Drawing.Color]::FromArgb(10, 10, 20)
$logBox.ForeColor   = [System.Drawing.Color]::FromArgb(180, 255, 180)
$logBox.Font        = New-Object System.Drawing.Font("Consolas", 9)
$logBox.ReadOnly    = $true
$logBox.ScrollBars  = "Vertical"
$logBox.BorderStyle = "None"
$form.Controls.Add($logBox)

function Write-Log($msg, $color = "LightGreen") {
    $logBox.Invoke([Action]{
        $logBox.SelectionStart  = $logBox.TextLength
        $logBox.SelectionLength = 0
        $logBox.SelectionColor  = [System.Drawing.Color]::$color
        $stamp = Get-Date -Format "HH:mm:ss"
        $logBox.AppendText("[$stamp] $msg`n")
        $logBox.ScrollToCaret()
    })
}

# Buttons
$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text      = "▶  Launch App"
$btnStart.Location  = New-Object System.Drawing.Point(20, 436)
$btnStart.Size      = New-Object System.Drawing.Size(160, 44)
$btnStart.BackColor = [System.Drawing.Color]::FromArgb(108, 99, 255)
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = "Flat"
$btnStart.Font      = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnStart.FlatAppearance.BorderSize = 0
$form.Controls.Add($btnStart)

$btnOpen = New-Object System.Windows.Forms.Button
$btnOpen.Text      = "🌐  Open Browser"
$btnOpen.Location  = New-Object System.Drawing.Point(200, 436)
$btnOpen.Size      = New-Object System.Drawing.Size(180, 44)
$btnOpen.BackColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$btnOpen.ForeColor = [System.Drawing.Color]::White
$btnOpen.FlatStyle = "Flat"
$btnOpen.Font      = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnOpen.FlatAppearance.BorderSize = 0
$btnOpen.Enabled   = $false
$form.Controls.Add($btnOpen)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text      = "⏹  Stop"
$btnStop.Location  = New-Object System.Drawing.Point(400, 436)
$btnStop.Size      = New-Object System.Drawing.Size(110, 44)
$btnStop.BackColor = [System.Drawing.Color]::FromArgb(244, 63, 94)
$btnStop.ForeColor = [System.Drawing.Color]::White
$btnStop.FlatStyle = "Flat"
$btnStop.Font      = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnStop.FlatAppearance.BorderSize = 0
$btnStop.Enabled   = $false
$form.Controls.Add($btnStop)

# ── Launch logic ─────────────────────────────────────────────────────────────────
$btnStart.Add_Click({
    $btnStart.Enabled = $false
    $btnStop.Enabled  = $true
    $logBox.Clear()

    Write-Log "Starting StudentOS..." "Cyan"

    # --- Backend ---
    $lblBackend.Text      = "⟳ Starting..."
    $lblBackend.ForeColor = [System.Drawing.Color]::FromArgb(251, 191, 36)

    $backendScript = {
        param($root)
        Set-Location $root
        $env:PYTHONPATH = $root
        python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 2>&1
    }
    $global:BackendJob = Start-Job -ScriptBlock $backendScript -ArgumentList $ROOT

    # --- Frontend ---
    $lblFrontend.Text      = "⟳ Starting..."
    $lblFrontend.ForeColor = [System.Drawing.Color]::FromArgb(251, 191, 36)

    $frontendScript = {
        param($root)
        Set-Location "$root\frontend"
        npm run dev 2>&1
    }
    $global:FrontendJob = Start-Job -ScriptBlock $frontendScript -ArgumentList $ROOT

    Write-Log "Backend  → http://localhost:8000" "White"
    Write-Log "Frontend → http://localhost:5173" "White"
    Write-Log "Waiting for services to boot..." "Gray"

    # ── Polling timer ────────────────────────────────────────────────────────────
    $global:checkCount   = 0
    $global:backendReady = $false
    $global:frontReady   = $false

    $global:Timer = New-Object System.Windows.Forms.Timer
    $global:Timer.Interval = 1500
    $global:Timer.Add_Tick({

        # Stream job output
        foreach ($job in @($global:BackendJob, $global:FrontendJob)) {
            if ($job) {
                $out = Receive-Job $job -ErrorAction SilentlyContinue
                if ($out) {
                    foreach ($line in $out) {
                        if ($line -match "error|Error|ERROR") {
                            Write-Log $line "Tomato"
                        } elseif ($line -match "warn|WARN") {
                            Write-Log $line "Orange"
                        } elseif ($line.Trim()) {
                            Write-Log $line "LightGreen"
                        }
                    }
                }
            }
        }

        $global:checkCount++

        # Check backend
        if (-not $global:backendReady) {
            try {
                $r = Invoke-RestMethod "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction Stop
                $global:backendReady = $true
                $lblBackend.Text      = "✅ Running"
                $lblBackend.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
                Write-Log "Backend is ready! (DB: $($r.database))" "LightGreen"
            } catch { }
        }

        # Check frontend
        if (-not $global:frontReady) {
            try {
                $null = Invoke-WebRequest "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
                $global:frontReady = $true
                $lblFrontend.Text      = "✅ Running"
                $lblFrontend.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
                Write-Log "Frontend is ready!" "LightGreen"
            } catch { }
        }

        if ($global:backendReady -and $global:frontReady) {
            $lblHealth.Text      = "✅ All systems go"
            $lblHealth.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
            $btnOpen.Enabled = $true
            $global:Timer.Stop()
            Write-Log "===========================================" "Cyan"
            Write-Log "  StudentOS is LIVE at http://localhost:5173" "Cyan"
            Write-Log "===========================================" "Cyan"
            Start-Process "http://localhost:5173"
        } elseif ($global:checkCount -gt 40) {
            $global:Timer.Stop()
            Write-Log "Startup timed out. Check logs above for errors." "Tomato"
        }
    })
    $global:Timer.Start()
})

$btnOpen.Add_Click({ Start-Process "http://localhost:5173" })

$btnStop.Add_Click({
    $global:Timer.Stop()
    Write-Log "Stopping services..." "Orange"
    Stop-All
    $lblBackend.Text       = "⏸ Stopped"
    $lblBackend.ForeColor  = [System.Drawing.Color]::FromArgb(120, 120, 150)
    $lblFrontend.Text      = "⏸ Stopped"
    $lblFrontend.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 150)
    $lblHealth.Text        = "⏸ Stopped"
    $lblHealth.ForeColor   = [System.Drawing.Color]::FromArgb(120, 120, 150)
    $btnOpen.Enabled  = $false
    $btnStart.Enabled = $true
    $btnStop.Enabled  = $false
    Write-Log "All services stopped." "Gray"
})

$form.Add_FormClosing({ Stop-All })

[System.Windows.Forms.Application]::Run($form)
