"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConference } from "@/app/lib/conferenceContext";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const conf = useConference();

  const next = useMemo(() => sp.get("next") || "/", [sp]);
  const codeRequired = Boolean(conf.accessCodeRequired);

  const [displayName, setDisplayName] = useState("");
  const [accessCode, setAccessCode] = useState(sp.get("code") ?? "");
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
      if (!r.ok) throw new Error(j?.error || "Sign-in failed");
      router.replace(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-6 space-y-5">
        <div className="flex items-center gap-3">
          {conf.logo && <img src={conf.logo} alt="" className="h-10 w-auto object-contain" />}
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{conf.name}</h1>
            <p className="text-sm text-gray-500">
              {codeRequired ? "Talks are open to registered attendees." : "Sign in to ask questions and save talks."}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="displayName">Your name</label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="First and last name"
              autoComplete="name"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Presenters see this name when you ask a question.</p>
          </div>

          {codeRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="accessCode">Attendee access code</label>
              <input
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="From your registration email or badge"
                autoComplete="off"
                autoCapitalize="none"
                required
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</div>
          )}

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
