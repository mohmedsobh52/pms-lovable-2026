#!/bin/bash

# Project Management System - Database Migration Script
# This script executes the SQL migration for setting up the PMS database schema

set -e  # Exit on error

echo "🚀 Starting Project Management System Database Migration..."

# Source the environment variables
if [ -f .env.development.local ]; then
    set -a
    source .env.development.local
    set +a
else
    echo "❌ Error: .env.development.local file not found"
    exit 1
fi

# Verify required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "✅ Environment variables loaded"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

echo "📝 Running SQL migrations..."

# Execute the migration runner script
node scripts/run-migrations.js

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
    echo "🎉 Project Management System is ready to use"
else
    echo "❌ Migration failed"
    exit 1
fi
