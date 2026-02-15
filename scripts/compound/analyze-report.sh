#!/bin/bash

# scripts/compound/analyze-report.sh
# Analyzes a priority report and extracts the top priority item

REPORT_FILE="$1"

if [ -z "$REPORT_FILE" ] || [ ! -f "$REPORT_FILE" ]; then
    echo '{"error": "No report file provided or file not found", "priority_item": null, "branch_name": null}'
    exit 1
fi

# Read the report content
REPORT_CONTENT=$(cat "$REPORT_FILE")

# Find the first unchecked item ([ ]) in High Priority section
# This is a simple parser - you can make it more sophisticated
PRIORITY_ITEM=$(echo "$REPORT_CONTENT" | grep -A 100 "## High Priority" | grep -m 1 '\[ \]' | sed 's/.*\[ \] //' | tr -d '\r')

# If no high priority, check medium
if [ -z "$PRIORITY_ITEM" ]; then
    PRIORITY_ITEM=$(echo "$REPORT_CONTENT" | grep -A 100 "## Medium Priority" | grep -m 1 '\[ \]' | sed 's/.*\[ \] //' | tr -d '\r')
fi

# If still nothing, check low priority
if [ -z "$PRIORITY_ITEM" ]; then
    PRIORITY_ITEM=$(echo "$REPORT_CONTENT" | grep -A 100 "## Low Priority" | grep -m 1 '\[ \]' | sed 's/.*\[ \] //' | tr -d '\r')
fi

# If still nothing, check for any numbered items
if [ -z "$PRIORITY_ITEM" ]; then
    PRIORITY_ITEM=$(echo "$REPORT_CONTENT" | grep -E '^\s*[0-9]+\.' | head -1 | sed 's/^[0-9]*\.\s*//' | tr -d '\r')
fi

if [ -z "$PRIORITY_ITEM" ]; then
    echo '{"priority_item": null, "branch_name": null}'
    exit 0
fi

# Generate a branch name from the priority item
# Convert to lowercase, replace spaces with hyphens, remove special chars
BRANCH_NAME=$(echo "$PRIORITY_ITEM" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | cut -c1-50)
BRANCH_NAME="compound/${BRANCH_NAME}-$(date +%Y%m%d)"

# Output as JSON
cat << EOF
{
    "priority_item": "$PRIORITY_ITEM",
    "branch_name": "$BRANCH_NAME",
    "report_file": "$REPORT_FILE"
}
EOF
