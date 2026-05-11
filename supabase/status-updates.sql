alter table public.scrape_runs
  add column if not exists current_step text,
  add column if not exists status_message text,
  add column if not exists progress int not null default 0 check (progress >= 0 and progress <= 100),
  add column if not exists status_updated_at timestamptz not null default now();

notify pgrst, 'reload schema';
