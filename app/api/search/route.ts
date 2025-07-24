
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // NOTE: This query assumes you have added a `pagerank` column to your `urls` table.
    // You can add it with a command like:
    // ALTER TABLE urls ADD COLUMN pagerank DOUBLE PRECISION DEFAULT 0.0;
    //
    // The final score is a weighted combination of text relevance and PageRank.
    // I'm using ts_rank_cd for relevance, which is often better than ts_rank.
    // You can adjust the weights (e.g., 1.0 for relevance, 0.5 for PageRank) to tune results.
    const searchQuery = `
      SELECT 
        id,
        url,
        title,
        description,
        netloc,
        processed_at,
        (
          1.0 * ts_rank_cd(
            to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')), 
            plainto_tsquery('english', $1)
          )
          -- You can adjust the weight of PageRank here.
          + 0.5 * COALESCE(pagerank, 0.0) 
        ) AS final_score
      FROM urls 
      WHERE 
        status = 'completed' 
        AND (
          to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')) 
          @@ plainto_tsquery('english', $1)
        )
      ORDER BY final_score DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM urls 
      WHERE 
        status = 'completed' 
        AND (
          to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')) 
          @@ plainto_tsquery('english', $1)
        )
    `;

    const [searchResults, countResults] = await Promise.all([
      pool.query(searchQuery, [query, limit, offset]),
      pool.query(countQuery, [query])
    ]);

    const totalResults = parseInt(countResults.rows[0].total);
    // As requested, pagination is limited to a maximum of 5 pages.
    const totalPages = Math.min(Math.ceil(totalResults / limit), 5);

    return NextResponse.json({
      results: searchResults.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalResults,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
