#!/bin/bash
# Deploy database migrations to production

echo "🚀 Deploying Prisma Migrations to Production Database"
echo "======================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create a .env file with your production DATABASE_URL"
    exit 1
fi

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    # Try to load from .env
    export $(grep "^DATABASE_URL=" .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

# Show database being used (masked for security)
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
echo -e "${GREEN}✓ Target database: ${DB_HOST}${NC}"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}⚠️  WARNING: This will apply migrations to your database${NC}"
echo "Press Ctrl+C to cancel, or"
read -p "Press Enter to continue..."
echo ""

# Generate Prisma Client
echo -e "${YELLOW}📦 Generating Prisma Client...${NC}"
npx prisma generate
echo ""

# Show migration status before deployment
echo -e "${YELLOW}📊 Current migration status:${NC}"
npx prisma migrate status
echo ""

# Deploy migrations
echo -e "${YELLOW}🚀 Deploying migrations...${NC}"
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migrations deployed successfully!${NC}"
    echo ""

    # Show final status
    echo -e "${YELLOW}📊 Final migration status:${NC}"
    npx prisma migrate status
    echo ""

    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ All database indexes have been applied${NC}"
    echo -e "${GREEN}✓ Your database schema is up to date${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
else
    echo ""
    echo -e "${RED}❌ Migration deployment failed${NC}"
    echo "Check the error messages above for details"
    exit 1
fi
