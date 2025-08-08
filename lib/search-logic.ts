import { searchScoringConfig } from "./config";
import { ANONYMOUS_SEARCH_LIMIT } from "./constants";
import { db } from "./db";
import type { SearchResult, User } from "./db/types";
import { getEmbedding } from "./embedding";
import { countAnonymousSearches, recordSearch } from "./search";

export type SearchApiError = {
  error: string;
  code:
    | "RATE_LIMIT_EXCEEDED"
    | "MISSING_QUERY"
    | "SEARCH_LIMIT_EXCEEDED"
    | "INTERNAL_SERVER_ERROR"
    | "UNKNOWN_API_ERROR";
};

async function performHybridSearch(
  query: string,
  queryVector: number[],
  scoringConfig: {
    ftsWeight: number;
    vectorWeight: number;
    pagerankWeight: number;
    rrfK: number;
  },
): Promise<SearchResult[]> {
  const sql = `
    WITH fts_results AS (
      SELECT
        url_id,
        (ts_rank_cd(uc.search_vector, websearch_to_tsquery('english', $2))) as score,
        row_number() OVER (ORDER BY ts_rank_cd(uc.search_vector, websearch_to_tsquery('english', $2)) DESC) as rank
      FROM url_content uc
      JOIN urls u ON uc.url_id = u.id
      WHERE
        u.status = 'completed'
        AND uc.search_vector @@ websearch_to_tsquery('english', $2)
      LIMIT 100
    ),
    vector_results AS (
      SELECT
        url_id,
        embedding <=> $1::vector as distance,
        row_number() OVER (ORDER BY embedding <=> $1::vector ASC) as rank
      FROM url_content
      WHERE embedding IS NOT NULL
      ORDER BY distance
      LIMIT 100
    )
    SELECT
      u.url,
      uc.title,
      uc.description,
      (
        ($3 * COALESCE(1.0 / ($6 + fts.rank), 0.0)) + ($4 * COALESCE(1.0 / ($6 + vec.rank), 0.0))
      ) * (1 + ($5 * u.pagerank_score)) AS score
    FROM
      urls u
    JOIN
      url_content uc ON u.id = uc.url_id
    LEFT JOIN
      fts_results fts ON uc.url_id = fts.url_id
    LEFT JOIN
      vector_results vec ON uc.url_id = vec.url_id
    WHERE
      fts.url_id IS NOT NULL OR vec.url_id IS NOT NULL
    ORDER BY
      score DESC
    LIMIT 20;
  `;

  const vectorString = `[${queryVector.join(",")}]`;
  const result = await db.query<SearchResult>(sql, [
    vectorString,
    query,
    scoringConfig.ftsWeight,
    scoringConfig.vectorWeight,
    scoringConfig.pagerankWeight,
    scoringConfig.rrfK,
  ]);
  return result.rows;
}

async function performFtsSearch(
  query: string,
  scoringConfig: {
    ftsWeight: number;
    pagerankWeight: number;
  },
): Promise<SearchResult[]> {
  const sql = `
    SELECT
      u.url,
      uc.title,
      uc.description,
      ($2 * ts_rank_cd(uc.search_vector, websearch_to_tsquery('english', $1))) + ($3 * u.pagerank_score) AS score
    FROM
      urls u
    JOIN
      url_content uc ON u.id = uc.url_id
    WHERE
      u.status = 'completed' AND uc.search_vector @@ websearch_to_tsquery('english', $1)
    ORDER BY
      score DESC
    LIMIT 20;
  `;

  const result = await db.query<SearchResult>(sql, [
    query,
    scoringConfig.ftsWeight,
    scoringConfig.pagerankWeight,
  ]);
  return result.rows;
}

export async function executeSearch(
  query: string,
  user: User | null,
  ipAddress: string | null,
): Promise<SearchResult[] | SearchApiError> {
  if (!query || query.trim() === "") {
    return {
      error: "Query parameter is required.",
      code: "MISSING_QUERY",
    };
  }

  const cleanedQuery = query.trim().toLowerCase();

  if (!user && ipAddress) {
    const existingSearch = await db.query(
      "SELECT 1 FROM search_history WHERE ip_address = $1 AND query = $2 AND user_id IS NULL LIMIT 1",
      [ipAddress, cleanedQuery],
    );

    if (existingSearch.rowCount === 0) {
      const searchCount = await countAnonymousSearches(ipAddress);
      if (searchCount >= ANONYMOUS_SEARCH_LIMIT) {
        return {
          error: "Search limit exceeded. Please log in to continue.",
          code: "SEARCH_LIMIT_EXCEEDED",
        };
      }
    }
  }

  if (ipAddress || user) {
    await recordSearch({
      userId: user?.id,
      ipAddress: ipAddress,
      query: cleanedQuery,
    });
  }

  try {
    let searchResults: SearchResult[];
    try {
      const queryVector = await getEmbedding(cleanedQuery);
      searchResults = await performHybridSearch(
        cleanedQuery,
        queryVector,
        searchScoringConfig.hybrid,
      );
    } catch (embeddingError) {
      console.warn(
        `Embedding generation failed for query "${cleanedQuery}". Falling back to full-text search. Error: ${embeddingError}`,
      );
      searchResults = await performFtsSearch(
        cleanedQuery,
        searchScoringConfig.fts,
      );
    }
    return searchResults;
  } catch (error) {
    console.error(`Search logic error: ${error}`);
    return {
      error: "An internal error occurred.",
      code: "INTERNAL_SERVER_ERROR",
    };
  }
}
