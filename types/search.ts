// types/search.ts
export interface SearchResult {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  netloc: string;
  processed_at: string | null;
  // This score now combines text relevance and PageRank.
  final_score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
