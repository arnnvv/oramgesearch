// Existing User and Session types remain the same for auth
export type User = {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string;
};

export type Session = {
  id: string;
  user_id: number;
  expires_at: Date;
};

// --- NEW TYPES FOR CRAWLER AND SEARCH ---

export type CrawlStatus =
  | "pending_classification"
  | "pending_crawl"
  | "classifying"
  | "crawling"
  | "completed"
  | "failed"
  | "irrelevant";

export type RenderingType = "SSR" | "CSR";

export type Url = {
  id: number; // bigserial maps to number in JS
  url: string;
  netloc: string;
  status: CrawlStatus;
  rendering: RenderingType | null;
  error_message: string | null;
  locked_at: Date | null;
  processed_at: Date | null;
  pagerank_score: number; // real maps to number
};

export type UrlContent = {
  url_id: number;
  title: string | null;
  description: string | null;
  content: string | null;
  search_vector: string; // tsvector is represented as a string
};

export type UrlEdge = {
  source_url_id: number;
  dest_url_id: number;
};

// This is the shape of the data our search API will return for each result.
export type SearchResult = {
  url: string;
  title: string;
  description: string | null;
  score: number;
};
