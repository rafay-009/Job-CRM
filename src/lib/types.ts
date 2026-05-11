export type UserRole = "worker" | "scraper" | "admin";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type ScrapeRun = {
  id: string;
  user_id: string;
  tech_stack: string;
  keyword: string;
  region: string;
  time_filter: string;
  source_urls: string[];
  status: "pending" | "running" | "completed" | "failed" | string;
  current_step: string | null;
  status_message: string | null;
  progress: number;
  status_updated_at: string;
  total_results: number;
  error_message: string | null;
  created_at: string;
  users_profile?: Pick<UserProfile, "email"> | null;
};

export type JobResult = {
  id: string;
  run_id: string;
  user_id: string;
  job_title: string;
  company: string;
  job_link: string;
  source_url: string;
  posted_time: string;
  tech_stack: string;
  keyword: string;
  location: string;
  is_remote: boolean;
  created_at: string;
};

export type AppliedJobClick = {
  id: string;
  user_id: string;
  job_id: string;
  clicked_at: string;
  applied_on: string;
};
