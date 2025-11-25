#!/bin/bash

# Deploy migrations to production Prisma database
# This script uses the production DATABASE_URL from .env

echo "🚀 Deploying migrations to production database..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your production DATABASE_URL"
    exit 1
fi

# Run migrations
npx prisma migrate deploy

echo ""
echo "✅ Migration deployment complete!"
