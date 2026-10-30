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
  takenDownBy?: string;
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

type Intro = {
  id: string;
  posterId: string;
  talkTitle: string;
  presenterName: string;
  presenterEmail: string;
  attendeeName: string;
  requestedAt: string | null;
  doneAt: string | null;
};

export default function PresentersAdminClient() {
  const [confs, setConfs] = useState<Conference[]>([]);
  const [sub, setSub] = useState("");
  const [form, setForm] = useState<Conference | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [issued, setIssued] = useState<Record<string, string>>({});
  const [intros, setIntros] = useState<Intro[]>([]);

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

  const loadIntros = useCallback(async (sourceId: string) => {
    const r = await fetch(`/api/admin/intros?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
    if (r.ok) setIntros((await r.json()).intros ?? []);
  }, []);

  useEffect(() => {
    if (form?.sourceId) {
      loadReport(form.sourceId);
      loadIntros(form.sourceId);
    }
  }, [form?.sourceId, loadReport, loadIntros]);

  async function markIntro(id: string, done: boolean) {
    setIntros((list) => list.map((i) => (i.id === id ? { ...i, doneAt: done ? new Date().toISOString() : null } : i)));
    await fetch("/api/admin/intros", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, done }),
    }).catch(() => {});
  }

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

  async function setTakenDown(posterId: string, down: boolean) {
    if (down && !confirm("Take this talk down? Attendees will no longer see it, and the presenter can't restore it.")) return;
    const r = down
      ? await fetch(`/api/posters/${posterId}`, { method: "DELETE" })
      : await fetch(`/api/posters/${posterId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ deleted: false }),
        });
    if (r.ok && form?.sourceId) loadReport(form.sourceId);
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-600">
        {confs.length === 0 ? "Loading conferences…" : "Pick a conference."}
      </main>
    );
  }

  const presenterLink = shareLink(form.subdomain, "/present", form.presenterCode ? { code: form.presenterCode } : {});
  const attendeeLink = form.accessCode
    ? shareLink(form.subdomain, "/login", { code: form.accessCode })
    : shareLink(form.subdomain, "/", {});

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="text-blue-600">← Conference</Link>
              <Link href="/admin" className="text-blue-600">Admin</Link>
              <Link href="/insights" className="text-blue-600">Organizer insights →</Link>
            </div>
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
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-800">Conference name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className="input mt-1" />
            <p className="mt-1 text-xs text-gray-500">Shown on the sign-in, upload, presenter and insights pages.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-900">Presenter uploads</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.presenterUploadsOpen !== false} onChange={(e) => set("presenterUploadsOpen", e.target.checked)} />
                Accept presenter uploads
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-800">Presenter code (optional)</label>
                <div className="mt-1 flex gap-2">
                  <input value={form.presenterCode ?? ""} onChange={(e) => set("presenterCode", e.target.value)} className="input font-mono" placeholder="none: anyone with the link can upload" />
                  <button type="button" onClick={() => set("presenterCode", generateCode(form.subdomain.slice(0, 6)))} className="shrink-0 rounded-md border px-3 text-sm">
                    Generate
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Leave blank for zero-effort sharing. Add one only if uploads need gating.</p>
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
            <LinkRow label="Presenters" value={form.presenterUploadsOpen === false ? "Uploads are closed" : presenterLink} />
            <LinkRow label="Attendees (QR code)" value={attendeeLink} />
          </div>
        </section>

        {/* Introduction requests */}
        {form && (
          <section className="rounded-xl border bg-white p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-gray-900">Introduction requests</h2>
              <p className="text-sm text-gray-600 mt-1">
                Presenters asking you to connect them with an attendee who sent them a note without sharing an email.
                Names are as the attendee entered them when signing in; match them to your registration list.
              </p>
            </div>
            {intros.length === 0 ? (
              <p className="text-sm text-gray-500">None yet.</p>
            ) : (
              <ul className="divide-y">
                {intros.map((i) => (
                  <li key={i.id} className={`py-3 flex flex-wrap items-start gap-3 ${i.doneAt ? "opacity-60" : ""}`}>
                    <div className="flex-1 min-w-[220px] text-sm">
                      <p className="text-gray-900">
                        <span className="font-medium">{i.presenterName || "Presenter"}</span> would like to meet{" "}
                        <span className="font-medium">{i.attendeeName}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <a href={`/view/${i.posterId}`} className="hover:underline">{i.talkTitle}</a>
                        {i.presenterEmail && (
                          <>
                            {" · "}
                            <a href={`mailto:${i.presenterEmail}`} className="text-blue-600 hover:underline">{i.presenterEmail}</a>
                          </>
                        )}
                        {i.requestedAt && <> · {new Date(i.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                      </p>
                    </div>
                    <button
                      onClick={() => markIntro(i.id, !i.doneAt)}
                      className={`text-xs ${i.doneAt ? "text-gray-500" : "text-emerald-700"} hover:underline`}
                    >
                      {i.doneAt ? "Introduced · undo" : "Mark introduced"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Report */}
        {report && (
          <section className="rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Conference report</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Tile label="Live talks" value={report.totals.talks} sub={`${report.totals.selfUploaded} presenter-uploaded`} />
              <Tile label="People who opened a deck" value={report.totals.distinctViewers} />
              <Tile label="Deck opens (people × talks)" value={report.totals.deckOpens} />
              <Tile label="Questions" value={report.totals.questions} />
              <Tile label="Asked to be contacted" value={report.totals.followups} />
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
                    <th className="py-2 pr-3 text-right">Contact requests</th>
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
                            <div className="mt-1 flex items-center gap-2">
                              <input readOnly value={issued[r.id]} onFocus={(e) => e.currentTarget.select()} className="input font-mono text-xs" />
                              <a href={issued[r.id]} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-medium text-blue-600 hover:underline">
                                Open
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-700">
                          {r.status}
                          {r.takenDownBy === "presenter" && <div className="text-xs text-gray-500">by presenter</div>}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.viewers}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.questions}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.followups}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.interested}</td>
                        <td className="py-2 pr-3 text-right whitespace-nowrap space-x-3">
                          {r.selfUploaded && (
                            <button onClick={() => issueLink(r.id)} className="text-xs text-blue-600 hover:underline">
                              New presenter link
                            </button>
                          )}
                          {r.status === "taken down" ? (
                            r.takenDownBy === "presenter" ? null : (
                            <button onClick={() => setTakenDown(r.id, false)} className="text-xs text-emerald-700 hover:underline">
                              Restore
                            </button>
                            )
                          ) : (
                            <button onClick={() => setTakenDown(r.id, true)} className="text-xs text-red-600 hover:underline">
                              Take down
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
