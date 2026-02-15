#!/bin/bash

# scripts/compound/loop.sh
# Execution loop that runs tasks one at a time until complete
# Adapted for Claude Code

set -e

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
MAX_ITERATIONS=${1:-25}
TASKS_FILE="$PROJECT_DIR/scripts/compound/prd.json"
LOG_FILE="$PROJECT_DIR/logs/auto-compound.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [LOOP] $1" | tee -a "$LOG_FILE"
}

cd "$PROJECT_DIR"

if [ ! -f "$TASKS_FILE" ]; then
    log "No tasks file found at $TASKS_FILE"
    exit 1
fi

log "Starting execution loop (max $MAX_ITERATIONS iterations)..."

for i in $(seq 1 $MAX_ITERATIONS); do
    log "--- Iteration $i of $MAX_ITERATIONS ---"

    # Check if tasks file exists and has pending tasks
    if [ ! -f "$TASKS_FILE" ]; then
        log "Tasks file not found. Exiting loop."
        break
    fi

    # Get first pending task
    PENDING_TASK=$(jq -r '.tasks[] | select(.status == "pending") | .title' "$TASKS_FILE" | head -1)

    if [ -z "$PENDING_TASK" ] || [ "$PENDING_TASK" = "null" ]; then
        log "All tasks complete!"
        break
    fi

    log "Working on task: $PENDING_TASK"

    # Execute the task with Claude Code
    claude -p "You are working through a task list. Read the tasks from scripts/compound/prd.json.

Your current task is: $PENDING_TASK

Instructions:
1. Implement this specific task
2. Make the necessary code changes
3. Run tests if applicable (npm run type-check, npm run lint)
4. If successful, update the task status to 'completed' in scripts/compound/prd.json
5. Commit your changes with a descriptive message
6. If you encounter an error you cannot resolve, update the task status to 'blocked' and add an 'error' field explaining why

Stay focused on this single task. Do not work on other tasks yet." --dangerously-skip-permissions

    # Small delay between iterations
    sleep 5

    # Check if task was completed or blocked
    TASK_STATUS=$(jq -r --arg title "$PENDING_TASK" '.tasks[] | select(.title == $title) | .status' "$TASKS_FILE")

    if [ "$TASK_STATUS" = "blocked" ]; then
        log "Task blocked: $PENDING_TASK"
        # Continue to next task instead of failing
    elif [ "$TASK_STATUS" = "completed" ]; then
        log "Task completed: $PENDING_TASK"
    else
        log "Task status unclear: $TASK_STATUS - continuing..."
    fi
done

log "Execution loop finished."

# Summary
COMPLETED=$(jq '[.tasks[] | select(.status == "completed")] | length' "$TASKS_FILE")
PENDING=$(jq '[.tasks[] | select(.status == "pending")] | length' "$TASKS_FILE")
BLOCKED=$(jq '[.tasks[] | select(.status == "blocked")] | length' "$TASKS_FILE")

log "Summary: $COMPLETED completed, $PENDING pending, $BLOCKED blocked"
