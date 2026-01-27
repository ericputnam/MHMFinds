#!/bin/bash
set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Starting Ralph"

for ((i=1; i<=$MAX_ITERATIONS; i++)); do
  echo "Iteration $i"
  echo "--------------------------------"

  result=$(echo "Do it all. Yes to everything. Proceed." | claude --dangerously-skip-permissions -p "@$SCRIPT_DIR/prd.json @$SCRIPT_DIR/progress.txt" \
"Complete the next incomplete story (passes:false) in prd.json. If all complete, output <promise>COMPLETE</promise>.

Steps: write script → run it → typecheck → update prd.json passes:true → update progress.txt → git commit.

The user's response to any question is: YES, PROCEED, DO IT.
" 2>&1)

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete, exiting."
    echo "Ralph complete after $i iterations"
    exit 0
  fi
done

echo "⚠️ Max iterations reached ($MAX_ITERATIONS)"
exit 1
