import { globalGETRateLimit } from "@/lib/requests";
import type { JSX } from "react";
import { Search } from "lucide-react";

export default async function ProfileContent(): Promise<JSX.Element> {
  if (!(await globalGETRateLimit())) {
    return <div>Too many requests</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-200 via-blue-200 to-indigo-300" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-2xl mb-16">
          <div className="relative">
            <div className="backdrop-blur-2xl bg-white/15 rounded-3xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] p-4">
              <div className="backdrop-blur-xl bg-white/25 rounded-2xl border border-white/30 shadow-[0_4px_16px_0_rgba(31,38,135,0.2)] p-4 transition-all duration-300 hover:bg-white/30 hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.3)]">
                <div className="flex items-center space-x-4">
                  <Search className="text-gray-600 w-6 h-6 flex-shrink-0 opacity-70" />
                  <input
                    type="text"
                    placeholder="What would you like to find today?"
                    className="flex-1 bg-transparent text-gray-700 placeholder-gray-500 text-lg outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-400/20 via-blue-400/20 to-indigo-400/20 blur-xl -z-10 opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
