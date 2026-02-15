#!/bin/bash

# scripts/compound/setup.sh
# Sets up the nightly compound automation system

set -e

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"
PLIST_SOURCE="$PROJECT_DIR/scripts/compound/launchd"

echo "🔧 Setting up MHMFinds Compound Automation..."

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCHD_DIR"

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Function to install a plist
install_plist() {
    local plist_name="$1"
    local source="$PLIST_SOURCE/$plist_name"
    local dest="$LAUNCHD_DIR/$plist_name"

    # Unload if already loaded
    if launchctl list | grep -q "${plist_name%.plist}"; then
        echo "  Unloading existing $plist_name..."
        launchctl unload "$dest" 2>/dev/null || true
    fi

    # Copy plist to LaunchAgents
    echo "  Installing $plist_name..."
    cp "$source" "$dest"

    # Load the plist
    echo "  Loading $plist_name..."
    launchctl load "$dest"
}

echo ""
echo "📦 Installing launchd plists..."

install_plist "com.mhmfinds.daily-compound-review.plist"
install_plist "com.mhmfinds.auto-compound.plist"
install_plist "com.mhmfinds.caffeinate.plist"

echo ""
echo "✅ Verifying installation..."
echo ""

launchctl list | grep mhmfinds || echo "Warning: No mhmfinds jobs found in launchctl"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Schedule:"
echo "  • 5:00 PM  - Caffeinate starts (keeps Mac awake until 2 AM)"
echo "  • 10:30 PM - Compound Review (extracts learnings, updates CLAUDE.md)"
echo "  • 11:00 PM - Auto-Compound (picks priority, implements, creates PR)"
echo ""
echo "Useful commands:"
echo "  • View logs:    tail -f $PROJECT_DIR/logs/compound-review.log"
echo "  • Test review:  launchctl start com.mhmfinds.daily-compound-review"
echo "  • Test auto:    launchctl start com.mhmfinds.auto-compound"
echo "  • List jobs:    launchctl list | grep mhmfinds"
echo "  • Unload all:   ./scripts/compound/unload.sh"
echo ""
echo "⚠️  Make sure 'claude' CLI is in your PATH and authenticated!"
echo "    Test with: claude --version"
