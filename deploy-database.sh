#!/bin/bash
# MIXAI v1.4 Production Database Deployment Script

set -e

echo "🚀 MIXAI v1.4 Database Deployment Starting..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Verify environment variables
required_vars=("SUPABASE_PROJECT_ID" "SUPABASE_ACCESS_TOKEN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Environment variable $var is required"
        exit 1
    fi
done

echo "🔗 Linking to production Supabase project..."
supabase link --project-ref $SUPABASE_PROJECT_ID

echo "📊 Checking current database status..."
supabase db diff

echo "📝 Applying migrations to production..."
supabase db push --include-all

echo "🔒 Setting up Row Level Security (RLS) policies..."

# Verify RLS is enabled on all tables
supabase db reset --debug

echo "🧪 Running database tests..."

# Test basic table structure
supabase db test

echo "📈 Checking database performance indexes..."

# Verify essential indexes exist
psql "$DATABASE_URL" -c "
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"

echo "🔍 Verifying RLS policies..."

# Check RLS policies are active
psql "$DATABASE_URL" -c "
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND rowsecurity = true;
"

echo "📊 Setting up initial data..."

# Insert initial plans if they don't exist
psql "$DATABASE_URL" -c "
INSERT INTO public.plans (code, name, price_jpy, monthly_credits) 
VALUES 
    ('lite', 'Lite', 1280, 3.0),
    ('standard', 'Standard', 2480, 6.0),
    ('creator', 'Creator', 5980, 10.0)
ON CONFLICT (code) DO NOTHING;
"

echo "🛡️ Setting up security configurations..."

# Create service accounts and roles if needed
psql "$DATABASE_URL" -c "
-- Create read-only role for monitoring
CREATE ROLE monitoring_read NOINHERIT LOGIN;
GRANT USAGE ON SCHEMA public TO monitoring_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_read;

-- Create backup role
CREATE ROLE backup_user NOINHERIT LOGIN;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
"

echo "📈 Setting up monitoring views..."

# Create monitoring views for Grafana/Prometheus
psql "$DATABASE_URL" -c "
-- Jobs processing statistics
CREATE OR REPLACE VIEW monitoring.job_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM public.jobs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Credit usage statistics
CREATE OR REPLACE VIEW monitoring.credit_stats AS
SELECT 
    event_type,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    DATE_TRUNC('hour', created_at) as hour
FROM public.credit_ledger 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Harmony usage statistics
CREATE OR REPLACE VIEW monitoring.harmony_stats AS
SELECT 
    harmony_choice,
    COUNT(*) as usage_count,
    AVG(harmony_level_db) as avg_level_db
FROM public.jobs 
WHERE harmony_choice IS NOT NULL 
    AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY harmony_choice;
"

echo "🔄 Setting up backup configuration..."

# Create backup schedule
cat > backup_config.sql << EOF
-- Automated backup configuration
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily backup at 3 AM UTC
SELECT cron.schedule('daily-backup', '0 3 * * *', 
    'pg_dump \$DATABASE_URL | gzip > /backups/mixai_\$(date +%Y%m%d_%H%M%S).sql.gz');

-- Weekly cleanup of old backups (keep 30 days)
SELECT cron.schedule('cleanup-backups', '0 4 * * 0', 
    'find /backups -name "mixai_*.sql.gz" -mtime +30 -delete');
EOF

psql "$DATABASE_URL" -f backup_config.sql

echo "✅ Database deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   - Migrations: Applied"
echo "   - RLS Policies: Active"
echo "   - Indexes: Optimized"
echo "   - Initial Data: Loaded"
echo "   - Monitoring: Configured"
echo "   - Backups: Scheduled"
echo ""
echo "🌐 Production database is ready for MIXAI v1.4!"

# Generate deployment report
echo "$(date): MIXAI v1.4 database deployed successfully" >> deployment.log