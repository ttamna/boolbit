# ABOUTME: Windows Task Scheduler에서 autonomous-dev 에이전트를 헤드리스로 실행하는 스크립트
# ABOUTME: 30분 주기로 vision-widget 코드베이스를 자율 개선한다

# UTF-8 인코딩 강제 (pwsh 7+ 기본값이지만 명시)
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 경로 설정
$ProjectDir = "C:\Users\gyunw\projects\vision-widget"
$LogDir     = "$ProjectDir\tools\logs"
$LockFile   = "$env:TEMP\vision-widget-autodev.lock"
$LogFile    = "$LogDir\autonomous-dev-$(Get-Date -Format 'yyyy-MM-dd').log"
$ClaudePath = "C:\Users\gyunw\AppData\Local\Volta\bin\claude.cmd"

# 중복 실행 방지
if (Test-Path $LockFile) {
    $ExistingPid = Get-Content $LockFile -ErrorAction SilentlyContinue
    if ($ExistingPid -and (Get-Process -Id $ExistingPid -ErrorAction SilentlyContinue)) {
        Add-Content $LogFile "[$(Get-Date -Format 'HH:mm:ss')] Already running (PID $ExistingPid) -- skip"
        exit 0
    }
    Add-Content $LogFile "[$(Get-Date -Format 'HH:mm:ss')] Stale lockfile (PID $ExistingPid dead) -- continuing"
}
$PID | Set-Content $LockFile

# 정리 트랩
try {
    # PATH에 Volta 포함
    $env:PATH = "C:\Users\gyunw\AppData\Local\Volta\bin;" + $env:PATH

    # CLAUDECODE 제거 (nested session 차단 방지)
    Remove-Item Env:CLAUDECODE -ErrorAction SilentlyContinue

    # 로그 헤더
    Add-Content $LogFile ""
    Add-Content $LogFile "=== autonomous-dev 시작: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="

    # 프로젝트 디렉토리로 이동
    Set-Location $ProjectDir

    # autonomous-dev 실행
    & $ClaudePath --dangerously-skip-permissions --print "/autonomous-dev" 2>&1 |
        ForEach-Object { Add-Content $LogFile "[$(Get-Date -Format 'HH:mm:ss')] $_"; $_ }

    Add-Content $LogFile "=== 완료: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
}
finally {
    Remove-Item $LockFile -ErrorAction SilentlyContinue
}
