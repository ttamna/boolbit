#!/usr/bin/env bash
# ABOUTME: launchd에서 process-issues 커맨드를 헤드리스로 실행하는 macOS 스크립트
# ABOUTME: 10분 주기로 GitHub 이슈를 자동 처리한다

set -euo pipefail

# 환경 변수 (launchd는 PATH/HOME 미설정)
export HOME="/Users/chang-younglee"
export PATH="$HOME/.volta/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export LANG="ko_KR.UTF-8"

PROJECT_DIR="/Users/chang-younglee/01.studies/boolbit"
LOG_DIR="$PROJECT_DIR/tools/logs"
LOCK_FILE="/tmp/boolbit-process-issues.lock"
LOG_FILE="$LOG_DIR/process-issues-$(date +%Y-%m-%d).log"
CLAUDE="$HOME/.volta/bin/claude"

# 중복 실행 방지
if [ -f "$LOCK_FILE" ]; then
  EXISTING_PID=$(cat "$LOCK_FILE")
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "[$(date +%H:%M:%S)] Already running (PID $EXISTING_PID) -- skip" >> "$LOG_FILE"
    exit 0
  fi
  echo "[$(date +%H:%M:%S)] Stale lockfile (PID $EXISTING_PID dead) -- continuing" >> "$LOG_FILE"
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# CLAUDECODE 제거 (nested session 차단 방지)
unset CLAUDECODE

echo "" >> "$LOG_FILE"
echo "=== process-issues 시작: $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG_FILE"

cd "$PROJECT_DIR"

"$CLAUDE" --dangerously-skip-permissions --print "/process-issues" 2>&1 \
  | while IFS= read -r line; do
      echo "[$(date +%H:%M:%S)] $line" >> "$LOG_FILE"
    done

echo "=== 완료: $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG_FILE"
