import { getCurrentSession } from "@/app/actions";
import { ANONYMOUS_SEARCH_LIMIT } from "@/lib/constants";
import { db } from "@/lib/db";
import type { SearchResult } from "@/lib/db/types";
import { getClientIp, globalGETRateLimit } from "@/lib/requests";
import { countAnonymousSearches, recordSearch } from "@/lib/search";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  if (!(await globalGETRateLimit())) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim() === "") {
    return new Response(
      JSON.stringify({
        error: "Query parameter is required.",
        code: "MISSING_QUERY",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const cleanedQuery = query.trim().toLowerCase();
  const { user } = await getCurrentSession();
  const ipAddress = await getClientIp();

  if (!user && ipAddress) {
    const existingSearch = await db.query(
      "SELECT 1 FROM search_history WHERE ip_address = $1 AND query = $2 AND user_id IS NULL LIMIT 1",
      [ipAddress, cleanedQuery],
    );

    if (existingSearch.rowCount === 0) {
      const searchCount = await countAnonymousSearches(ipAddress);
      if (searchCount >= ANONYMOUS_SEARCH_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "Search limit exceeded. Please log in to continue.",
            code: "SEARCH_LIMIT_EXCEEDED",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
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
    const sql = `
      SELECT
        u.url,
        uc.title,
        uc.description,
        (ts_rank_cd(uc.search_vector, websearch_to_tsquery('english', $1)) + u.pagerank_score) AS score
      FROM
        urls u
      JOIN
        url_content uc ON u.id = uc.url_id
      WHERE
        u.status = 'completed'
        AND uc.search_vector @@ websearch_to_tsquery('english', $1)
      ORDER BY
        score DESC
      LIMIT 20;
    `;

    const result = await db.query<SearchResult>(sql, [query]);

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(`Search API error: ${error}`);
    return new Response(
      JSON.stringify({
        error: "An internal error occurred.",
        code: "INTERNAL_SERVER_ERROR",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
