import { getClientIp, globalGETRateLimit } from "@/lib/requests";
import type { JSX } from "react";
import { Suspense } from "react";
import { SearchResultsList } from "@/components/SearchResultsList";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { executeSearch } from "@/lib/search-logic";
import { getCurrentSession } from "@/app/actions";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

function LoginPrompt() {
  return (
    <div className="text-center py-10 rounded-lg bg-white shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Search Limit Reached
      </h2>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        You've used all your free searches. Please log in to unlock unlimited
        searching and other features.
      </p>
      <Button asChild>
        <Link href="/login/google">Log In with Google</Link>
      </Button>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps): Promise<JSX.Element> {
  if (!globalGETRateLimit()) {
    return <div>Too many requests</div>;
  }

  const query = (await searchParams).q;

  if (!query) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">
          Please enter a search term on the homepage.
        </p>
      </div>
    );
  }

  const { user } = await getCurrentSession();
  const ipAddress = await getClientIp();
  const resultsOrError = await executeSearch(query, user, ipAddress);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Suspense fallback={<p>Loading search results...</p>}>
          {Array.isArray(resultsOrError) ? (
            <SearchResultsList query={query} results={resultsOrError} />
          ) : resultsOrError.code === "SEARCH_LIMIT_EXCEEDED" ? (
            <LoginPrompt />
          ) : (
            <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg">
              <p className="font-semibold">An error occurred</p>
              <p>{resultsOrError.error}</p>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}
