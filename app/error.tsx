"use client";

/** Friendly fallback when a page fails to load (instead of a blank error screen). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border rounded-xl p-6 text-center space-y-3">
        <p className="text-lg font-semibold text-gray-900">Something went wrong loading this page.</p>
        <p className="text-sm text-gray-600">Please try again. If it keeps happening, go back to the conference.</p>
        <div className="flex justify-center gap-3 pt-2">
          <button onClick={() => reset()} className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium">
            Try again
          </button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700">
            Back to the conference
          </a>
        </div>
        {error.digest && <p className="text-xs text-gray-400">Reference {error.digest}</p>}
      </div>
    </main>
  );
}
