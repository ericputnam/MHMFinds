#!/bin/bash

# ============================================
# Sync Environment Variables to Vercel
# ============================================
# This script uploads all variables from .env.production to Vercel
# Run: npm run env:push
# ============================================

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  MHMFinds Environment Variable Sync   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
  echo -e "${RED}Error: .env.production file not found!${NC}"
  echo "Please create .env.production with your production values"
  exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
  npm install -g vercel
fi

# Login to Vercel
echo -e "${BLUE}Step 1: Vercel Authentication${NC}"
vercel whoami &> /dev/null || vercel login

# Link to project if not already linked
if [ ! -d ".vercel" ]; then
  echo -e "${BLUE}Step 2: Linking to Vercel Project${NC}"
  vercel link
fi

echo ""
echo -e "${BLUE}Step 3: Uploading Environment Variables${NC}"
echo -e "${YELLOW}This will upload ALL variables from .env.production to Vercel${NC}"
echo ""

# Ask for confirmation
read -p "Upload to which environment? (production/preview/development): " env_choice
env_choice=${env_choice:-production}

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will upload variables to ${env_choice} environment${NC}"
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ]; then
  echo -e "${RED}Aborted${NC}"
  exit 0
fi

echo ""
echo -e "${GREEN}Uploading variables...${NC}"
echo ""

# Counter for tracking
success_count=0
error_count=0
skip_count=0

# Read .env.production and upload each variable
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^#.*  ]] && continue

  # Remove leading/trailing whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)

  # Skip if key or value is empty
  if [ -z "$key" ] || [ -z "$value" ]; then
    continue
  fi

  # Skip placeholder values
  if [[ "$value" == "your-"* ]] || [[ "$value" == "xxxxx"* ]] || [[ "$value" == "REPLACE_WITH_"* ]]; then
    echo -e "${YELLOW}⊘ Skipped: $key (placeholder value)${NC}"
    ((skip_count++))
    continue
  fi

  # Upload to Vercel
  if vercel env add "$key" "$env_choice" <<< "$value" &> /dev/null; then
    echo -e "${GREEN}✓ Uploaded: $key${NC}"
    ((success_count++))
  else
    # Variable might already exist, try to update
    if echo "$value" | vercel env rm "$key" "$env_choice" -y &> /dev/null && \
       vercel env add "$key" "$env_choice" <<< "$value" &> /dev/null; then
      echo -e "${GREEN}✓ Updated: $key${NC}"
      ((success_count++))
    else
      echo -e "${RED}✗ Failed: $key${NC}"
      ((error_count++))
    fi
  fi
done < .env.production

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Upload Summary               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo -e "${GREEN}Success: $success_count variables${NC}"
echo -e "${YELLOW}Skipped: $skip_count variables (placeholders)${NC}"
echo -e "${RED}Errors: $error_count variables${NC}"
echo ""

if [ $error_count -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Some variables failed to upload. Please upload them manually in Vercel Dashboard.${NC}"
  echo "https://vercel.com/dashboard"
fi

if [ $skip_count -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Some variables were skipped because they have placeholder values.${NC}"
  echo "Please update .env.production with real values and run this script again."
fi

echo ""
echo -e "${GREEN}✓ Done!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify variables in Vercel Dashboard: https://vercel.com/dashboard"
echo "2. Update any skipped variables manually"
echo "3. Trigger a new deployment: vercel --prod"
echo ""
