import { globalGETRateLimit } from "@/lib/requests";
import type { JSX } from "react";
import { SearchForm } from "@/components/SearchForm";

export default async function ProfileContent(): Promise<JSX.Element> {
  if (!(await globalGETRateLimit())) {
    return <div>Too many requests</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-200 via-blue-200 to-indigo-300" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <SearchForm />
      </div>
    </div>
  );
}
