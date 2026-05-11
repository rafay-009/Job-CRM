export type StartRunPayload = {
  id: string;
  user_id: string;
  tech_stack: string;
  keyword: string;
  source_urls: string[];
  user_access_token?: string;
};

export type FirecrawlPage = {
  sourceUrl: string;
  markdown: string;
  raw: Record<string, unknown>;
  markdownPath?: string;
};

export type ExtractedJobRow = {
  job_title: string;
  company: string;
  job_link: string;
  clearance: string;
  posted_time: string;
};
