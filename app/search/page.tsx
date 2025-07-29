import type { SearchResult } from "@/lib/db/types";
import { globalGETRateLimit } from "@/lib/requests";
import type { JSX } from "react";
import { Suspense } from "react";
import { SearchResultsList } from "@/components/SearchResultsList";

// The props interface is now simpler, no Promise.
interface SearchPageProps {
  searchParams: {
    q?: string;
  };
}

async function fetchSearchResults(query: string): Promise<SearchResult[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL environment variable is not set.");
  }

  const response = await fetch(
    `${appUrl}/api/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText}`);
    const errorBody = await response.text();
    console.error("Error Body:", errorBody);
    // Return empty array on failure to prevent crashing the page
    return [];
  }

  return response.json();
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps): Promise<JSX.Element> {
  if (!(await globalGETRateLimit())) {
    return <div>Too many requests</div>;
  }

  // THIS IS THE FIX: Direct access to searchParams.q
  const query = searchParams.q;

  if (!query) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please enter a search term on the homepage.</p>
      </div>
    );
  }

  // The rest of the component can now correctly use the query
  const results = await fetchSearchResults(query);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Suspense fallback={<p>Loading search results...</p>}>
          <SearchResultsList query={query} results={results} />
        </Suspense>
      </main>
    </div>
  );
}
