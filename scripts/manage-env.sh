#!/bin/bash
# Environment Management Helper Script

echo "🔧 ModVault Environment Manager"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_menu() {
    echo "What would you like to do?"
    echo ""
    echo "1) Pull production env vars from Vercel"
    echo "2) Push .env.production to Vercel"
    echo "3) Check which env vars are set in Vercel"
    echo "4) Test database connection (local)"
    echo "5) Test database connection (production)"
    echo "6) Generate new NEXTAUTH_SECRET"
    echo "7) Show environment differences"
    echo "8) Exit"
    echo ""
    read -p "Enter choice [1-8]: " choice
}

pull_env() {
    echo -e "${YELLOW}Pulling production environment variables...${NC}"
    vercel env pull .env.production.local
    echo -e "${GREEN}✓ Saved to .env.production.local${NC}"
    echo -e "${RED}⚠️  Do not commit this file!${NC}"
}

push_env() {
    echo -e "${YELLOW}Pushing .env.production to Vercel...${NC}"
    echo "This will upload all variables from .env.production"
    read -p "Continue? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        # This is a simplified version - you'd need to parse the file
        echo -e "${YELLOW}Use: vercel env add VARIABLE_NAME${NC}"
        echo "Or use the Vercel dashboard for bulk uploads"
    fi
}

list_env() {
    echo -e "${YELLOW}Checking Vercel environment variables...${NC}"
    vercel env ls
}

test_local_db() {
    echo -e "${YELLOW}Testing local database connection...${NC}"
    npx tsx -e "import 'dotenv/config'; import { prisma } from './lib/prisma'; prisma.\$queryRaw\`SELECT 1 as test\`.then(r => console.log('✅ Local DB connected!', r)).catch(e => console.error('❌ Failed:', e.message)).finally(() => process.exit())"
}

test_prod_db() {
    echo -e "${YELLOW}Testing production database connection...${NC}"
    echo "Make sure your .env has production DATABASE_URL"
    read -p "Continue? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        npx tsx -e "import 'dotenv/config'; import { prisma } from './lib/prisma'; prisma.\$queryRaw\`SELECT 1 as test\`.then(r => console.log('✅ Production DB connected!', r)).catch(e => console.error('❌ Failed:', e.message)).finally(() => process.exit())"
    fi
}

generate_secret() {
    echo -e "${YELLOW}Generating new NEXTAUTH_SECRET...${NC}"
    secret=$(openssl rand -base64 32)
    echo ""
    echo -e "${GREEN}New secret:${NC}"
    echo "$secret"
    echo ""
    echo "Add this to your Vercel environment variables:"
    echo "NEXTAUTH_SECRET=$secret"
}

show_diff() {
    echo -e "${YELLOW}Environment Differences:${NC}"
    echo ""
    echo "Local .env file:"
    grep -E "^[A-Z_]+=.*" .env | head -5
    echo ""
    echo "Production .env.production file:"
    grep -E "^[A-Z_]+=.*" .env.production | head -5
    echo ""
    echo -e "${YELLOW}Note: Full comparison requires manual review${NC}"
}

# Main loop
while true; do
    show_menu

    case $choice in
        1) pull_env ;;
        2) push_env ;;
        3) list_env ;;
        4) test_local_db ;;
        5) test_prod_db ;;
        6) generate_secret ;;
        7) show_diff ;;
        8) echo "Goodbye!"; exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac

    echo ""
    read -p "Press enter to continue..."
    clear
done
