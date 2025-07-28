"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, JSX } from "react";
import { useEffect, useRef, useState } from "react";

export function SearchForm(): JSX.Element {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const isMac =
    typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  const shortcutHint = isMac ? "⌘K" : "Ctrl+K";

  return (
    <div className="w-full max-w-2xl mb-16">
      <div className="relative">
        <form
          onSubmit={handleSubmit}
          className="backdrop-blur-2xl bg-white/15 rounded-3xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] p-4"
        >
          <div className="backdrop-blur-xl bg-white/25 rounded-2xl border border-white/30 shadow-[0_4px_16px_0_rgba(31,38,135,0.2)] p-4 transition-all duration-300 hover:bg-white/30 hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.3)]">
            <div className="flex items-center space-x-4">
              <Search className="text-gray-600 w-6 h-6 flex-shrink-0 opacity-70" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`${shortcutHint} to start typing`}
                className="flex-1 bg-transparent text-gray-700 placeholder-gray-500 text-lg outline-none"
              />
            </div>
          </div>
        </form>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-400/20 via-blue-400/20 to-indigo-400/20 blur-xl -z-10 opacity-50" />
      </div>
    </div>
  );
}
