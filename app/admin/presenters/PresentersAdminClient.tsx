"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Conference = {
  subdomain: string;
  name: string;
  logo?: string;
  sessionLabel?: string;
  sourceId: string;
  isRepo?: boolean;
  requireLogin?: boolean;
  accessCode?: string;
  presenterCode?: string;
  presenterUploadsOpen?: boolean;
  endDate?: string;
  liveDaysAfter?: number;
};

type Row = {
  id: string;
  title: string;
  author: string;
  presenterName?: string;
  presenterEmail?: string;
  selfUploaded: boolean;
  status: "live" | "taken down" | "expired";
  liveUntil: string | null;
  viewers: number;
  questions: number;
  followups: number;
  interested: number;
  saved: number;
};

type Report = {
  totals: {
    talks: number;
    selfUploaded: number;
    distinctViewers: number;
    deckOpens: number;
    questions: number;
    followups: number;
  };
  rows: Row[];
};

// Readable, hard-to-guess codes: no 0/O/1/l/I
function generateCode(prefix: string) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const part = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${prefix}-${part.slice(0, 4)}-${part.slice(4)}`;
}

function hostFor(subdomain: string) {
  if (typeof window === "undefined") return `https://${subdomain}.1stcite.app`;
  const h = window.location.host;
  // On a conference subdomain already? swap it; otherwise default to 1stcite.app
  const m = h.match(/^[^.]+\.(1stcite\.(app|com))$/);
  return `https://${subdomain}.${m ? m[1] : "1stcite.app"}`;
}

/** On a Vercel preview, share links that stay on the preview (with ?conf=). */
function isPreview() {
  return typeof window !== "undefined" && /\.vercel\.app$|^localhost/.test(window.location.hostname) &&
    !/^(www\.)?presentrxiv\.vercel\.app$/.test(window.location.hostname);
}

function shareLink(subdomain: string, path: string, params: Record<string, string>) {
  const base = isPreview() ? window.location.origin : hostFor(subdomain);
  const q = new URLSearchParams({ ...params, ...(isPreview() ? { conf: subdomain } : {}) }).toString();
  return `${base}${path}${q ? `?${q}` : ""}`;
}

export default function PresentersAdminClient() {
  const [confs, setConfs] = useState<Conference[]>([]);
  const [sub, setSub] = useState("");
  const [form, setForm] = useState<Conference | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [issued, setIssued] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/conference?all=1")
      .then((r) => r.json())
      .then((all: Conference[]) => {
        const list = (Array.isArray(all) ? all : []).filter((c) => !c.isRepo);
        setConfs(list);
        const fromCookie = typeof document !== "undefined" ? (document.cookie.match(/(?:^|; )px_conf=([^;]+)/)?.[1] ?? "") : "";
        const here = isPreview() ? fromCookie : typeof window !== "undefined" ? window.location.host.split(".")[0] : "";
        const pick = list.find((c) => c.subdomain === here) ?? list[0];
        if (pick) setSub(pick.subdomain);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const c = confs.find((x) => x.subdomain === sub);
    setForm(c ? { ...c } : null);
    setMsg(null);
    setIssued({});
  }, [sub, confs]);

  const loadReport = useCallback(async (sourceId: string) => {
    const r = await fetch(`/api/admin/conference-report?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
    if (r.ok) setReport(await r.json());
  }, []);

  useEffect(() => {
    if (form?.sourceId) loadReport(form.sourceId);
  }, [form?.sourceId, loadReport]);

  function set<K extends keyof Conference>(k: K, v: Conference[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/conference", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subdomain: form.subdomain,
          name: form.name,
          logo: form.logo,
          sessionLabel: form.sessionLabel,
          sourceId: form.sourceId,
          isRepo: form.isRepo ?? false,
          requireLogin: Boolean(form.requireLogin),
          accessCode: form.accessCode ?? "",
          presenterCode: form.presenterCode ?? "",
          presenterUploadsOpen: form.presenterUploadsOpen !== false,
          endDate: form.endDate ?? "",
          liveDaysAfter: form.liveDaysAfter ?? 30,
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Save failed");
      setConfs((cs) => cs.map((c) => (c.subdomain === form.subdomain ? { ...form } : c)));
      setMsg("Saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function issueLink(posterId: string) {
    if (!confirm("Issue a new presenter link? The old link will stop working.")) return;
    const r = await fetch("/api/admin/manage-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ posterId }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && form) setIssued((m) => ({ ...m, [posterId]: shareLink(form.subdomain, j.manageUrl, {}) }));
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-600">
        {confs.length === 0 ? "Loading conferences…" : "Pick a conference."}
      </main>
    );
  }

  const presenterLink = form.presenterCode ? shareLink(form.subdomain, "/present", { code: form.presenterCode }) : "";
  const attendeeLink = form.accessCode
    ? shareLink(form.subdomain, "/login", { code: form.accessCode })
    : shareLink(form.subdomain, "/", {});

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-sm text-blue-600">← Admin</Link>
            <h1 className="text-2xl font-bold text-gray-900">Presenters &amp; access</h1>
          </div>
          <select value={sub} onChange={(e) => setSub(e.target.value)} className="rounded-md border px-3 py-2 text-sm bg-white">
            {confs.map((c) => (
              <option key={c.subdomain} value={c.subdomain}>
                {c.name} ({c.subdomain})
              </option>
            ))}
          </select>
        </div>

        {/* Settings */}
        <section className="rounded-xl border bg-white p-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-900">Presenter uploads</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.presenterUploadsOpen !== false} onChange={(e) => set("presenterUploadsOpen", e.target.checked)} />
                Accept presenter uploads
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-800">Presenter code</label>
                <div className="mt-1 flex gap-2">
                  <input value={form.presenterCode ?? ""} onChange={(e) => set("presenterCode", e.target.value)} className="input font-mono" placeholder="none: uploads off" />
                  <button type="button" onClick={() => set("presenterCode", generateCode(form.subdomain.slice(0, 6)))} className="shrink-0 rounded-md border px-3 text-sm">
                    Generate
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Goes in presenter acceptance emails. Changing it locks out the old one.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-800">Last day of conference</label>
                  <input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className="input mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">Live for (days after)</label>
                  <input type="number" min={0} max={3650} value={form.liveDaysAfter ?? 30} onChange={(e) => set("liveDaysAfter", Number(e.target.value))} className="input mt-1" />
                </div>
              </div>
              <p className="text-xs text-gray-500">Applies to talks uploaded from now on. Presenters can extend their own.</p>
            </div>

            <div className="space-y-3">
              <h2 className="font-semibold text-gray-900">Attendee access</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(form.requireLogin)} onChange={(e) => set("requireLogin", e.target.checked)} />
                Attendees must sign in to see talks
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-800">Attendee access code</label>
                <div className="mt-1 flex gap-2">
                  <input value={form.accessCode ?? ""} onChange={(e) => set("accessCode", e.target.value)} className="input font-mono" placeholder="none: name only" />
                  <button type="button" onClick={() => set("accessCode", generateCode("attend"))} className="shrink-0 rounded-md border px-3 text-sm">
                    Generate
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Print it on badges or in the program, or put it in the QR link below.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving} className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
              {saving ? "Saving…" : "Save settings"}
            </button>
            {msg && <span className="text-sm text-gray-600">{msg}</span>}
          </div>

          <div className="rounded-lg bg-gray-50 border p-4 space-y-2 text-sm">
            <p className="font-medium text-gray-900">Links to share (save settings first)</p>
            <LinkRow label="Presenters" value={presenterLink || "Set a presenter code to enable"} />
            <LinkRow label="Attendees (QR code)" value={attendeeLink} />
          </div>
        </section>

        {/* Report */}
        {report && (
          <section className="rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Conference report</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Tile label="Live talks" value={report.totals.talks} sub={`${report.totals.selfUploaded} presenter-uploaded`} />
              <Tile label="People who opened a deck" value={report.totals.distinctViewers} />
              <Tile label="Deck opens (people × talks)" value={report.totals.deckOpens} />
              <Tile label="Questions" value={report.totals.questions} />
              <Tile label="Follow-up requests" value={report.totals.followups} />
            </div>
            <p className="text-xs text-gray-500">
              Counts only. Names and contact details of attendees go to presenters, not organizers.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
                    <th className="py-2 pr-3">Talk</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Viewers</th>
                    <th className="py-2 pr-3 text-right">Questions</th>
                    <th className="py-2 pr-3 text-right">Follow-ups</th>
                    <th className="py-2 pr-3 text-right">Interested</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...report.rows]
                    .sort((a, b) => b.followups - a.followups || b.viewers - a.viewers)
                    .map((r) => (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3">
                          <a href={`/view/${r.id}`} className="font-medium text-gray-900 hover:underline">{r.title}</a>
                          <div className="text-xs text-gray-500">
                            {r.author}
                            {r.presenterEmail && <> · {r.presenterEmail}</>}
                          </div>
                          {issued[r.id] && (
                            <input readOnly value={issued[r.id]} onFocus={(e) => e.currentTarget.select()} className="input mt-1 font-mono text-xs" />
                          )}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-700">{r.status}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.viewers}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.questions}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.followups}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.interested}</td>
                        <td className="py-2 pr-3 text-right whitespace-nowrap">
                          {r.selfUploaded && (
                            <button onClick={() => issueLink(r.id)} className="text-xs text-blue-600 hover:underline">
                              New presenter link
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function LinkRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
      <span className="w-40 shrink-0 text-gray-600">{label}</span>
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="input font-mono text-xs" />
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xl font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
