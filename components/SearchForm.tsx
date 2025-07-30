"use client";

import { useEffect, useRef } from "react";

export function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      name="q"
      placeholder="Start typing to search..."
      className="flex-1 bg-transparent text-gray-700 placeholder-gray-500 text-lg outline-none"
    />
  );
}
