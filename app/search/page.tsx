
// app/search/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchResult, SearchResponse } from '@/types/search';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    if (query) {
      performSearch(query, currentPage);
    }
  }, [query, currentPage]);

  const performSearch = async (searchQuery: string, page: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&page=${page}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/search?${params.toString()}`);
  };

  if (!query) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">OrangeSearch</h1>
          <p>No search query provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">OrangeSearch</h1>
        <p className="text-gray-600">
          Search results for: <span className="font-semibold">"{query}"</span>
        </p>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="text-lg">Searching...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {results && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            About {results.pagination.totalResults} results
          </div>

          <div className="space-y-6">
            {results.results.map((result) => (
              <SearchResultItem key={result.id} result={result} />
            ))}
          </div>

          {results.pagination.totalPages > 1 && (
            <Pagination
              currentPage={results.pagination.currentPage}
              totalPages={results.pagination.totalPages}
              hasNextPage={results.pagination.hasNextPage}
              hasPrevPage={results.pagination.hasPrevPage}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

function SearchResultItem({ result }: { result: SearchResult }) {
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  return (
    <div className="border-b border-gray-200 pb-4">
      <div className="mb-1">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          {formatUrl(result.url)}
        </a>
      </div>

      <div className="mb-2">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl text-blue-800 hover:underline font-medium"
        >
          {result.title || 'Untitled'}
        </a>
      </div>

      {result.description && (
        <p className="text-gray-600 text-sm leading-relaxed">
          {result.description.length > 200
            ? result.description.substring(0, 200) + '...'
            : result.description}
        </p>
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onPageChange
}: {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex justify-center items-center space-x-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage}
        className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      {getPageNumbers().map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={`px-3 py-2 text-sm border rounded ${pageNum === currentPage
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 hover:bg-gray-50'
            }`}
        >
          {pageNum}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}
