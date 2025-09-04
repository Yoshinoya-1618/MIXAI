-- Monthly Credit Grant CRON Job
-- Runs on the 1st day of every month at 09:00 JST (00:00 UTC)

select cron.schedule(
  'monthly-credit-grant',
  '0 0 1 * *', -- At 00:00 UTC on day-of-month 1
  'SELECT net.http_post(
    url:=''https://PROJECT_REF.supabase.co/functions/v1/monthly-credit-grant'',
    headers:=''{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}''::jsonb
  ) as request_id;'
);