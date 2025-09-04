-- Master Schema Application Script for Uta Seion
-- Run this script to apply all database schema updates

-- 1. Jobs Schema (Updated)
\i jobs_schema.sql

-- 2. Credit Ledger
\i credit_ledger_schema.sql

-- 3. Plans
\i plans_schema.sql

-- 4. Subscriptions
\i subscriptions_schema.sql

-- 5. Storage Policies (if exists)
\i storage_policies.sql

-- 6. Idempotency (if exists)
\i idempotency_schema.sql