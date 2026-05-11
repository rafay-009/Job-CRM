# Mavericks United

Mavericks United is an enterprise job scraping dashboard built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Supabase PostgreSQL, Firecrawl, and Gemini.

## Features

- Supabase email/password auth
- Three roles: `admin`, `worker`, and `scraper`
- Worker job-link portal with tech stack/date filters and daily applied click counts
- Scraper-only form that creates a pending `scrape_runs` row and starts the Next.js Firecrawl/Gemini pipeline
- Scraper/admin results table and run history
- Admin-only dashboard with platform stats, all runs, saved jobs, and worker applied counts
- RLS policies so workers can read scraper-provided jobs and track only their own applied clicks

## Install

```bash
npm install
```

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [`supabase/schema.sql`](supabase/schema.sql).
4. In Authentication, enable Email provider.
5. In Authentication > URL Configuration, set:

```text
Site URL: https://webapp2-mocha.vercel.app
Redirect URLs:
https://webapp2-mocha.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

6. Create a user through the app or Supabase Auth. New users default to `worker`.
7. To change roles, run one of:

```sql
update public.users_profile
set role = 'admin'
where email = 'admin@company.com';

update public.users_profile
set role = 'scraper'
where email = 'scraper@company.com';

update public.users_profile
set role = 'worker'
where email = 'worker@company.com';
```

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Or use Supabase's newer public key name:
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_optional_server_only
FIRECRAWL_API_KEY=your_firecrawl_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
SCRAPER_BACKEND_SECRET=make_this_a_long_random_secret_optional_for_api_route
NEXT_PUBLIC_APP_URL=https://your-site.com
```

`SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `GEMINI_API_KEY`, and `SCRAPER_BACKEND_SECRET` are server-only secrets. Do not expose them in client components.

## Scrape Pipeline

When a scraper submits a search, the app:

1. Creates a `scrape_runs` row with status/progress fields.
2. Starts the Next.js backend scraper after the response begins.
3. Next.js sends each source URL to Firecrawl one by one and reads the returned markdown.
4. Next.js sends each URL's markdown to Gemini one by one using the markdown-table prompt.
5. Inserts extracted listings into `job_results`.
6. Updates `scrape_runs.status`, `current_step`, `status_message`, `progress`, `total_results`, and `error_message`.

Workers see saved jobs automatically on `/dashboard`. Opening a job link records one `applied_job_clicks` row per worker, job, and day.

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000/login`.

## Build

```bash
npm run build
```

## Routes

- `/login`
- `/dashboard`
- `/dashboard/search`
- `/dashboard/results`
- `/dashboard/history`
- `/admin`
