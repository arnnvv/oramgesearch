import { getCurrentSession } from "@/app/actions";
import { executeSearch } from "@/lib/search-logic";
import { getClientIp, globalGETRateLimit } from "@/lib/requests";
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
  const query = searchParams.get("q") ?? "";

  const { user } = await getCurrentSession();
  const ipAddress = await getClientIp();

  const resultsOrError = await executeSearch(query, user, ipAddress);

  if (Array.isArray(resultsOrError)) {
    return new Response(JSON.stringify(resultsOrError), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  const status =
    resultsOrError.code === "SEARCH_LIMIT_EXCEEDED"
      ? 403
      : resultsOrError.code === "MISSING_QUERY"
        ? 400
        : 500;
  return new Response(JSON.stringify(resultsOrError), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
