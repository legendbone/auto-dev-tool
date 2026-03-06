#!/bin/bash

# =============================================================================
# run-automation.sh - 自动化任务运行脚本
# =============================================================================
# 让 Claude Code 循环运行，自动完成 task.json 中的任务
#
# 用法: ./run-automation.sh <运行次数>
# 示例: ./run-automation.sh 10
#
# WARNING: 这是最危险的运行方式，最容易浪费 Token
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LOG_DIR="./automation-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/automation-$(date +%Y%m%d_%H%M%S).log"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" >> "$LOG_FILE"
    case $level in
        INFO)    echo -e "${BLUE}[INFO]${NC} ${message}" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} ${message}" ;;
        WARNING) echo -e "${YELLOW}[WARNING]${NC} ${message}" ;;
        ERROR)   echo -e "${RED}[ERROR]${NC} ${message}" ;;
        PROGRESS) echo -e "${CYAN}[PROGRESS]${NC} ${message}" ;;
    esac
}

count_remaining_tasks() {
    if [ -f "task.json" ]; then
        grep -c '"passes": false' task.json 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

if [ -z "$1" ]; then
    echo "用法: $0 <运行次数>"
    echo "示例: $0 5"
    exit 1
fi

if ! [[ "$1" =~ ^[0-9]+$ ]]; then
    echo "错误: 参数必须是正整数"
    exit 1
fi

TOTAL_RUNS=$1

echo ""
echo "========================================"
echo "  Claude Code 自动化任务运行器"
echo "========================================"
echo ""

log "INFO" "启动自动化，共 $TOTAL_RUNS 次运行"
log "INFO" "日志文件: $LOG_FILE"

if [ ! -f "task.json" ]; then
    log "ERROR" "未找到 task.json！请在项目根目录运行此脚本。"
    exit 1
fi

INITIAL_TASKS=$(count_remaining_tasks)
log "INFO" "初始剩余任务数: $INITIAL_TASKS"

for ((run=1; run<=TOTAL_RUNS; run++)); do
    echo ""
    echo "========================================"
    log "PROGRESS" "第 $run / $TOTAL_RUNS 次运行"
    echo "========================================"

    REMAINING=$(count_remaining_tasks)

    if [ "$REMAINING" -eq 0 ]; then
        log "SUCCESS" "所有任务已完成！"
        exit 0
    fi

    log "INFO" "本次运行前剩余任务: $REMAINING"

    RUN_START=$(date +%s)
    RUN_LOG="$LOG_DIR/run-${run}-$(date +%Y%m%d_%H%M%S).log"

    PROMPT_FILE=$(mktemp)
    cat > "$PROMPT_FILE" << 'PROMPT_EOF'
Please follow the workflow in CLAUDE.md:
1. Read task.json and select the next task with passes: false
2. Implement the task following all steps
3. Test thoroughly (run lint and build)
4. Update progress.txt with your work
5. Commit all changes including task.json update in a single commit

Start by reading task.json to find your task.
Please complete only one task in this session, and stop once you are done or if you encounter an unresolvable issue.
PROMPT_EOF

    if claude -p \
        --dangerously-skip-permissions \
        --allowed-tools "Bash Edit Read Write Glob Grep Task WebSearch WebFetch mcp__playwright__*" \
        < "$PROMPT_FILE" 2>&1 | tee "$RUN_LOG"; then
        RUN_END=$(date +%s)
        log "SUCCESS" "第 $run 次运行完成，耗时 $((RUN_END - RUN_START)) 秒"
    else
        RUN_END=$(date +%s)
        log "WARNING" "第 $run 次运行结束，退出码 $?，耗时 $((RUN_END - RUN_START)) 秒"
    fi

    rm -f "$PROMPT_FILE"

    REMAINING_AFTER=$(count_remaining_tasks)
    COMPLETED=$((REMAINING - REMAINING_AFTER))

    if [ "$COMPLETED" -gt 0 ]; then
        log "SUCCESS" "本次完成任务数: $COMPLETED"
    else
        log "WARNING" "本次未完成任何任务"
    fi

    log "INFO" "运行后剩余任务: $REMAINING_AFTER"

    if [ $run -lt $TOTAL_RUNS ]; then
        sleep 2
    fi
done

echo ""
echo "========================================"
log "SUCCESS" "自动化运行完毕！"
echo "========================================"

FINAL_REMAINING=$(count_remaining_tasks)
log "INFO" "总运行次数: $TOTAL_RUNS"
log "INFO" "完成任务数: $((INITIAL_TASKS - FINAL_REMAINING))"
log "INFO" "剩余任务数: $FINAL_REMAINING"
