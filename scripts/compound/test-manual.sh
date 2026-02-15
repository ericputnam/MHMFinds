#!/bin/bash

# scripts/compound/test-manual.sh
# Manually test the compound scripts without waiting for scheduled time

set -e

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"

echo "🧪 Manual Compound Test"
echo ""
echo "This will run the compound scripts manually."
echo ""

PS3="Select which script to test: "
options=("Daily Compound Review" "Auto-Compound (full pipeline)" "Just analyze report" "Quit")

select opt in "${options[@]}"
do
    case $opt in
        "Daily Compound Review")
            echo ""
            echo "Running daily compound review..."
            echo "This will review recent git history and update CLAUDE.md"
            echo ""
            "$PROJECT_DIR/scripts/daily-compound-review.sh"
            break
            ;;
        "Auto-Compound (full pipeline)")
            echo ""
            echo "Running auto-compound pipeline..."
            echo "This will pick a priority, create a PRD, and implement it."
            echo ""
            "$PROJECT_DIR/scripts/compound/auto-compound.sh"
            break
            ;;
        "Just analyze report")
            echo ""
            LATEST_REPORT=$(ls -t "$PROJECT_DIR/reports/"*.md 2>/dev/null | head -1)
            if [ -z "$LATEST_REPORT" ]; then
                echo "No reports found in reports/ directory"
                exit 1
            fi
            echo "Analyzing: $LATEST_REPORT"
            echo ""
            "$PROJECT_DIR/scripts/compound/analyze-report.sh" "$LATEST_REPORT" | jq .
            break
            ;;
        "Quit")
            echo "Bye!"
            exit 0
            ;;
        *) echo "Invalid option $REPLY";;
    esac
done

echo ""
echo "✅ Test complete. Check logs at: $PROJECT_DIR/logs/"
