"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = useMemo(() => sp.get("next") || "/", [sp]);

  const [displayName, setDisplayName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, accessCode }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Login failed");
      router.replace(next);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Attendee Login</h1>
        <p className="text-sm text-gray-600">
          Enter a display name (and optional access code) to continue.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="e.g., Bob Morris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Access code (optional)</label>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="Leave blank if not required"
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</div>}

          <button
            disabled={loading}
            className="w-full rounded-md bg-blue-600 text-white py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}