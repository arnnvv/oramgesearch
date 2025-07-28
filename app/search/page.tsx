import { globalGETRateLimit } from "@/lib/requests";
import type { JSX } from "react";
import { Suspense } from "react";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

function SearchResults({ query }: { query?: string }) {
  const displayQuery = query;
  return (
    <div className="text-center text-gray-700">
      <p className="text-lg">
        You searched for:{" "}
        <span className="font-semibold italic">{displayQuery}</span>
      </p>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps): Promise<JSX.Element> {
  if (!(await globalGETRateLimit())) {
    return <div>Too many requests</div>;
  }

  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-200 via-blue-200 to-indigo-300" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />

      <main className="relative z-10 flex flex-col items-center pt-24 sm:pt-32 px-6">
        <Suspense fallback={<div>Loading...</div>}>
          <SearchResults query={query} />
        </Suspense>
      </main>
    </div>
  );
}
