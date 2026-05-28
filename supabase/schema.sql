-- ─────────────────────────────────────────────────────────────
-- AKRO VENTURES — DEAL FLOW SCHEMA
-- Run this entire file in: Supabase Dashboard > SQL Editor
-- ─────────────────────────────────────────────────────────────

-- Enable UUID extension (usually already enabled on Supabase)
create extension if not exists "uuid-ossp";

-- ─── Custom types ─────────────────────────────────────────────
create type email_status_enum as enum (
  'pending',
  'drafted',
  'awaiting_approval',
  'sent',
  'failed'
);

create type approval_status_enum as enum (
  'pending',
  'approved',
  'rejected'
);

create type deal_stage_enum as enum (
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'growth',
  'other'
);

create type deal_source_enum as enum (
  'Backrr',
  'LinkedIn',
  'Referral',
  'Cold Outreach',
  'Event',
  'Other'
);

-- ─── Main deals table ─────────────────────────────────────────
create table if not exists deals (
  id                uuid primary key default uuid_generate_v4(),

  -- Startup info
  startup_name      text not null,
  website_url       text,
  linkedin_url      text,
  industry          text,
  stage             deal_stage_enum,
  source            deal_source_enum not null default 'Backrr',

  -- Founder info
  founder_name      text not null,
  founder_email     text not null,

  -- Links & files
  additional_links  jsonb not null default '[]'::jsonb,
  pitch_deck_url    text,

  -- Internal notes
  notes             text,

  -- AI output
  ai_summary        text,
  draft_email       text,

  -- Workflow state
  email_status      email_status_enum not null default 'pending',
  approval_status   approval_status_enum not null default 'pending',
  approval_token    uuid unique default uuid_generate_v4(),

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── Auto-update updated_at ───────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger deals_updated_at
  before update on deals
  for each row execute procedure set_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────
create index if not exists deals_email_status_idx    on deals (email_status);
create index if not exists deals_approval_status_idx on deals (approval_status);
create index if not exists deals_approval_token_idx  on deals (approval_token);
create index if not exists deals_created_at_idx      on deals (created_at desc);
create index if not exists deals_founder_email_idx   on deals (founder_email);

-- ─── Row Level Security ───────────────────────────────────────
-- The dashboard uses the service role key (bypasses RLS).
-- The anon key is only used for storage uploads from the browser.
-- We lock down the deals table to service role only.

alter table deals enable row level security;

-- No anon access to deals table (API routes use service role)
-- Service role bypasses RLS by default in Supabase.

-- If you want team members to read via anon key, uncomment:
-- create policy "Authenticated read" on deals
--   for select using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- STORAGE — run these in the Supabase Dashboard > Storage
-- OR via the Storage API. The SQL below creates the bucket
-- programmatically (requires pg_net or the management API).
--
-- MANUAL STEPS (simpler):
--   1. Go to Storage > New Bucket
--   2. Name: pitch-decks
--   3. Public: YES (so n8n can download the PDF via URL)
--   4. Allowed MIME types: application/pdf
--   5. Max file size: 20 MB
--
-- Then add this RLS policy to allow anon uploads:
-- ─────────────────────────────────────────────────────────────

-- Storage bucket RLS — allow anonymous users to upload PDFs only
-- Run in SQL Editor after creating the bucket:

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pitch-decks',
  'pitch-decks',
  true,
  20971520,   -- 20 MB in bytes
  array['application/pdf']
)
on conflict (id) do nothing;

-- Allow anyone to upload to pitch-decks (the API handles auth)
create policy "Public pitch deck uploads"
  on storage.objects for insert
  with check (bucket_id = 'pitch-decks');

-- Allow anyone to read from pitch-decks (PDFs are public links)
create policy "Public pitch deck reads"
  on storage.objects for select
  using (bucket_id = 'pitch-decks');
