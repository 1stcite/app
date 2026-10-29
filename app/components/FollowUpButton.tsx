"use client";

import { useEffect, useState } from "react";

/**
 * "Follow up" — lets an attendee ask the presenter to get in touch.
 * Contact details go only to that talk's presenter.
 */
export default function FollowUpButton({
  posterId,
  presenterName,
  signedIn,
  compact = false,
}: {
  posterId: string;
  presenterName?: string;
  signedIn: boolean;
  compact?: boolean;
}) {
  const [requested, setRequested] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    fetch(`/api/followups?posterId=${encodeURIComponent(posterId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setRequested(Boolean(j?.requested));
        if (j?.prefill) {
          setEmail(j.prefill.email || "");
          setOrganization(j.prefill.organization || "");
          setRole(j.prefill.role || "");
        }
      })
      .catch(() => {});
  }, [posterId, signedIn]);

  function onClick() {
    if (!signedIn) {
      window.location.href = `/login?next=${encodeURIComponent(`/view/${posterId}`)}`;
      return;
    }
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/followups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ posterId, email, organization, role, note }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Couldn't send your request.");
      setRequested(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your request.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    await fetch(`/api/followups?posterId=${encodeURIComponent(posterId)}`, { method: "DELETE" }).catch(() => {});
    setRequested(false);
    setBusy(false);
    setOpen(false);
  }

  const who = presenterName || "the presenter";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        title={requested ? "Follow-up requested" : `Ask ${who} to follow up with you`}
        className={[
          "inline-flex items-center gap-1 rounded-md font-medium transition-colors whitespace-nowrap",
          compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
          requested
            ? "bg-violet-50 text-violet-700 border border-violet-200"
            : "bg-violet-600 text-white hover:bg-violet-700",
        ].join(" ")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 4h16v12H5.17L4 17.17V4z" strokeLinejoin="round" />
          {requested && <path d="M8 10l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        {requested ? "Requested" : "Follow up"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[1000] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[90dvh] overflow-y-auto"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ask {who} to follow up</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your name and these details go only to {who}. Nothing is shared publicly.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="input mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-800">Organization</label>
                <input value={organization} onChange={(e) => setOrganization(e.target.value)} autoComplete="organization" className="input mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Role</label>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Partner, BD lead" className="input mt-1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800">What would you like to discuss?</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Optional" className="input mt-1" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-2 pt-1">
              <button disabled={busy} className="flex-1 rounded-md bg-violet-600 text-white py-2 font-medium disabled:opacity-60">
                {requested ? "Update request" : "Send request"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-gray-700">
                Cancel
              </button>
            </div>
            {requested && (
              <button type="button" onClick={withdraw} disabled={busy} className="text-xs text-gray-500 hover:underline">
                Withdraw my request
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
