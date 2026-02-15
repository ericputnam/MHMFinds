#!/bin/bash

# scripts/compound/unload.sh
# Unloads and removes the compound automation launchd jobs

LAUNCHD_DIR="$HOME/Library/LaunchAgents"

echo "🛑 Unloading MHMFinds Compound Automation..."

unload_plist() {
    local plist_name="$1"
    local plist_path="$LAUNCHD_DIR/$plist_name"

    if [ -f "$plist_path" ]; then
        echo "  Unloading $plist_name..."
        launchctl unload "$plist_path" 2>/dev/null || true
        rm "$plist_path"
        echo "  Removed $plist_path"
    else
        echo "  $plist_name not found, skipping..."
    fi
}

unload_plist "com.mhmfinds.daily-compound-review.plist"
unload_plist "com.mhmfinds.auto-compound.plist"
unload_plist "com.mhmfinds.caffeinate.plist"

echo ""
echo "✅ All compound automation jobs unloaded."
echo ""
echo "To re-enable, run: ./scripts/compound/setup.sh"
