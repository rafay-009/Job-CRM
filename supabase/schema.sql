create extension if not exists pgcrypto;

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'worker' check (role in ('worker', 'scraper', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.users_profile
  drop constraint if exists users_profile_role_check;

alter table public.users_profile
  alter column role set default 'worker';

update public.users_profile
set role = 'worker'
where role = 'user';

alter table public.users_profile
  add constraint users_profile_role_check check (role in ('worker', 'scraper', 'admin'));

create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  tech_stack text not null,
  keyword text not null,
  region text not null,
  time_filter text not null,
  source_urls jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  current_step text,
  status_message text,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  status_updated_at timestamptz not null default now(),
  total_results int not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.scrape_runs
  add column if not exists current_step text,
  add column if not exists status_message text,
  add column if not exists progress int not null default 0 check (progress >= 0 and progress <= 100),
  add column if not exists status_updated_at timestamptz not null default now();

create table if not exists public.job_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.scrape_runs(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  job_title text not null,
  company text not null,
  job_link text not null,
  source_url text not null,
  posted_time text,
  tech_stack text,
  keyword text,
  location text,
  is_remote boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.applied_job_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  job_id uuid not null references public.job_results(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  applied_on date not null default current_date,
  unique (user_id, job_id, applied_on)
);

create index if not exists scrape_runs_user_id_created_at_idx
  on public.scrape_runs(user_id, created_at desc);

create index if not exists job_results_user_id_created_at_idx
  on public.job_results(user_id, created_at desc);

create index if not exists job_results_run_id_idx
  on public.job_results(run_id);

create index if not exists applied_job_clicks_user_day_idx
  on public.applied_job_clicks(user_id, applied_on desc);

create index if not exists applied_job_clicks_job_id_idx
  on public.applied_job_clicks(job_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profile (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users_profile
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.users_profile
  where id = auth.uid();
$$;

alter table public.users_profile enable row level security;
alter table public.scrape_runs enable row level security;
alter table public.job_results enable row level security;

drop policy if exists "Users can read own profile" on public.users_profile;
create policy "Users can read own profile"
  on public.users_profile for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can create own profile" on public.users_profile;
create policy "Users can create own profile"
  on public.users_profile for insert
  with check (auth.uid() = id and role = 'worker');

drop policy if exists "Users can update own profile name" on public.users_profile;
create policy "Users can update own profile name"
  on public.users_profile for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = public.current_user_role()
  );

drop policy if exists "Users can read own scrape runs" on public.scrape_runs;
create policy "Users can read own scrape runs"
  on public.scrape_runs for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can create own scrape runs" on public.scrape_runs;
create policy "Users can create own scrape runs"
  on public.scrape_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own scrape runs" on public.scrape_runs;
create policy "Users can update own scrape runs"
  on public.scrape_runs for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can read own job results" on public.job_results;
drop policy if exists "Authenticated users can read job results" on public.job_results;
create policy "Authenticated users can read job results"
  on public.job_results for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated workflows can insert own job results" on public.job_results;
create policy "Authenticated workflows can insert own job results"
  on public.job_results for insert
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can update own job results" on public.job_results;
create policy "Users can update own job results"
  on public.job_results for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

alter table public.applied_job_clicks enable row level security;

drop policy if exists "Users can read own applied clicks" on public.applied_job_clicks;
create policy "Users can read own applied clicks"
  on public.applied_job_clicks for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can create own applied clicks" on public.applied_job_clicks;
create policy "Users can create own applied clicks"
  on public.applied_job_clicks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own applied clicks" on public.applied_job_clicks;
create policy "Users can update own applied clicks"
  on public.applied_job_clicks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated, service_role;
grant all on public.users_profile to authenticated, service_role;
grant all on public.scrape_runs to authenticated, service_role;
grant all on public.job_results to authenticated, service_role;
grant all on public.applied_job_clicks to authenticated, service_role;
