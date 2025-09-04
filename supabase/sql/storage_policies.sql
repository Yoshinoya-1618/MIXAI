-- Uta Seion — Storage buckets & RLS (private only)

-- Buckets (private=false -> public; set to false for private)
-- In Supabase, create buckets via Dashboard or SQL. Signature may vary by version.
-- The following works on recent versions; adjust if needed.
select storage.create_bucket('uta-uploads', false);
select storage.create_bucket('uta-results', false);

-- RLS policies on storage.objects
-- Read own uploads
create policy if not exists read_own_uploads on storage.objects
for select using (
  bucket_id = 'uta-uploads'
  and auth.role() = 'authenticated'
  and name like 'users/' || auth.uid()::text || '/%'
);

-- Write own uploads
create policy if not exists write_own_uploads on storage.objects
for insert with check (
  bucket_id = 'uta-uploads'
  and auth.role() = 'authenticated'
  and name like 'users/' || auth.uid()::text || '/%'
);

create policy if not exists update_own_uploads on storage.objects
for update using (
  bucket_id = 'uta-uploads'
  and auth.role() = 'authenticated'
  and name like 'users/' || auth.uid()::text || '/%'
);

-- Read own results (write via Service Role only)
create policy if not exists read_own_results on storage.objects
for select using (
  bucket_id = 'uta-results'
  and auth.role() = 'authenticated'
  and name like 'users/' || auth.uid()::text || '/%'
);

-- Do not create insert/update policies for results (Service Role writes)

