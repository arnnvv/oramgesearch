import { db } from "@/lib/db";
import type { SearchResult } from "@/lib/db/types";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim() === "") {
    return new Response(JSON.stringify({ error: "Query parameter is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // This SQL query is the heart of the search engine.
    // It joins the urls and url_content tables.
    // It uses websearch_to_tsquery for user-friendly query parsing.
    // It ranks results by a blended score of text relevance (ts_rank_cd) and authority (pagerank_score).
    const sql = `
      SELECT
        u.url,
        uc.title,
        uc.description,
        -- The final score is a blend of relevance and PageRank.
        -- You can tune the weights (e.g., multiply pagerank_score by a factor) to adjust ranking.
        (ts_rank_cd(uc.search_vector, websearch_to_tsquery('english', $1)) + u.pagerank_score) AS score
      FROM
        urls u
      JOIN
        url_content uc ON u.id = uc.url_id
      WHERE
        -- Filter for pages that have been successfully crawled and processed.
        u.status = 'completed'
        -- The '@@' operator performs the full-text search.
        AND uc.search_vector @@ websearch_to_tsquery('english', $1)
      ORDER BY
        score DESC
      LIMIT 20; -- Paginate to keep responses fast.
    `;

    const result = await db.query<SearchResult>(sql, [query]);

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
