"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConference } from "@/app/lib/conferenceContext";
import { uploadPdf } from "@/app/lib/uploadPdf";
import type { PresenterReport } from "@/app/lib/report";
import ViewSwitch from "@/app/components/ViewSwitch";

/** How this page was reached: the private link, or signed in (presenter or organizer). */
export type ManageAccess = { kind: "token"; token: string } | { kind: "session"; id: string };

type Talk = {
  id: string;
  title: string;
  abstract: string;
  author: string;
  presenterName: string;
  presenterOrg: string;
  presenterEmail: string;
  fileUrl: string;
  uploadedAt: string;
  liveUntil: string | null;
  takenDown: boolean;
  takenDownBy: string | null;
};

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function csvCell(v: string | undefined) {
  const s = (v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export default function ManageClient({ access }: { access: ManageAccess }) {
  const api = access.kind === "token" ? `/api/manage/${access.token}` : `/api/presenter/${access.id}`;
  const conf = useConference();
  const [talk, setTalk] = useState<Talk | null>(null);
  const [report, setReport] = useState<PresenterReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editAbstract, setEditAbstract] = useState("");
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const formFilled = useRef(false);

  const load = useCallback(async () => {
    const r = await fetch(api, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j?.error || "This link isn't valid.");
      return;
    }
    setTalk(j.talk);
    setReport(j.report);
    setIsOrganizer(j.viewer === "organizer");
    // Fill the edit form once, so background refreshes don't overwrite typing
    if (!formFilled.current) {
      setEditTitle(j.talk.title);
      setEditAbstract(j.talk.abstract);
      formFilled.current = true;
    }
  }, [api]);

  // Load now, refresh when the tab regains focus and every 30 s,
  // so new questions and follow-ups appear without a manual reload.
  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
    };
  }, [load]);

  async function patch(body: Record<string, unknown>, label: string, done: string) {
    setBusy(label);
    setNotice(null);
    try {
      const r = await fetch(api, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "That didn't work.");
      await load();
      setNotice(done);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  }

  async function replaceDeck(file: File | undefined) {
    if (!file) return;
    setBusy("replace");
    setNotice(null);
    try {
      const fileUrl = await uploadPdf(
        file,
        access.kind === "token" ? { manageToken: access.token } : { posterId: access.id },
        setProgress
      );
      await patch({ fileUrl }, "replace", "Deck replaced. Questions stay attached to their slide numbers.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Upload failed.");
      setBusy(null);
    }
  }

  /** Go to the attendee view (optionally a slide). From the private link, sign this device in first
   *  so the presenter can answer questions and switch back. */
  async function goAnswer(page?: number) {
    if (!talk) return;
    let viewUrl = `/view/${talk.id}`;
    if (access.kind === "token") {
      setBusy("signin");
      const r = await fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "signin" }),
      });
      const j = await r.json().catch(() => ({}));
      setBusy(null);
      if (r.ok && j.viewUrl) viewUrl = j.viewUrl;
    }
    window.location.href = page ? `${viewUrl}?page=${page}` : viewUrl;
  }

  function downloadFollowups() {
    if (!report || !talk) return;
    const rows = [
      ["Name", "Organization", "Role", "Email", "Note", "Sent"],
      ...report.followups.map((f) => [f.name, f.organization, f.role, f.email, f.note, f.at]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${talk.title.slice(0, 40).replace(/[^\w]+/g, "-")}-contacts.csv`;
    a.click();
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-md bg-white border rounded-xl p-6 text-gray-700">
          <p className="font-semibold text-gray-900">We couldn&apos;t open this presenter link.</p>
          <p className="mt-2 text-sm">{error} Check that you copied the whole link, or contact the organizers.</p>
        </div>
      </main>
    );
  }

  if (!talk || !report) {
    return <main className="min-h-screen bg-gray-50 p-8 text-gray-500">Loading your talk…</main>;
  }

  const maxViews = Math.max(1, ...report.slides.map((s) => s.views));
  const live = !talk.takenDown;
  // Private notes to the presenter vs. comments everyone can see
  const notes = report.questions.filter((q) => q.kind === "question" && !q.byPresenter);
  const publicQs = report.questions.filter((q) => !(q.kind === "question" && !q.byPresenter));
  const contactOnly = report.followups.filter((f) => !f.withNote); // contact requests sent without a note
  const noteCount = notes.length + contactOnly.length;
  const wantContact = report.followups.length;
  const questionCount = publicQs.length;
  const unanswered = publicQs.filter((q) => q.replies === 0 && !q.byPresenter).length;

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-4xl px-4 pt-3">
          <a href="/" className="text-sm text-blue-600 hover:underline">← Back to the conference</a>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-5 flex items-start gap-4">
          <a href="/" title="Back to the conference" className="shrink-0">
            <img src={conf.logo} alt="" className="h-10 w-auto object-contain" />
          </a>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your talk at {conf.name}</p>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{talk.title}</h1>
            <p className="text-sm text-gray-600">{talk.author}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {live ? (
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-medium">
                  Live{talk.liveUntil ? ` until ${fmtDate(talk.liveUntil)}` : ""}
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 text-gray-700 border px-2 py-0.5 font-medium">Taken down</span>
              )}
              <span className="text-gray-500">Updated {fmtDateTime(report.generatedAt)}</span>
            </div>
          </div>
          {live && (
            <div className="shrink-0">
              <ViewSwitch current="presenter" onAttendee={() => goAnswer()} />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {notice && <div className="rounded-md border bg-white px-4 py-2 text-sm text-gray-700">{notice}</div>}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {live && (
            <button
              onClick={() => goAnswer()}
              disabled={!!busy}
              className="rounded-md bg-blue-600 text-white px-3 py-2 text-sm font-medium disabled:opacity-60"
            >
              Answer questions in the deck
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            className="rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-800 disabled:opacity-60"
          >
            {busy === "replace" ? `Uploading… ${progress}%` : "Replace deck"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => replaceDeck(e.target.files?.[0])}
          />
          {live && (
            <button
              onClick={() => patch({ action: "extend" }, "extend", "Extended 30 days.")}
              disabled={!!busy}
              className="rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-800 disabled:opacity-60"
            >
              Keep live 30 more days
            </button>
          )}
          {live ? (
            <button
              onClick={() => {
                if (confirm("Take your talk down? Attendees will no longer see the deck or its questions. You can restore it from this page, or from My Talks. Your report stays available here."))
                  patch({ action: "takedown" }, "takedown", "Your talk is down. Restore it any time.");
              }}
              disabled={!!busy}
              className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
            >
              Take down
            </button>
          ) : (
            <button
              onClick={() => patch({ action: "restore" }, "restore", "Your talk is live again.")}
              disabled={!!busy}
              className="rounded-md bg-emerald-600 text-white px-3 py-2 text-sm font-medium disabled:opacity-60"
            >
              Restore
            </button>
          )}
        </div>

        {/* Headline numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Notes for you"
            value={noteCount}
            sub={wantContact ? `${wantContact} asked you to contact them` : undefined}
            accent
          />
          <Stat label="People who opened the deck" value={report.viewers} />
          <Stat label="Public questions and comments" value={questionCount} sub={unanswered ? `${unanswered} unanswered` : undefined} />
          <Stat
            label="Interested · attending · saved"
            value={`${report.interested.length} · ${report.attending.length} · ${report.saved.length}`}
          />
        </div>

        {/* Notes for you */}
        <Section
          title="Notes for you"
          action={
            wantContact > 0 && !isOrganizer ? (
              <button onClick={downloadFollowups} className="text-sm text-blue-600 hover:underline">
                Download contacts
              </button>
            ) : null
          }
        >
          {noteCount === 0 ? (
            <Empty>
              No notes yet. Attendees can send you a private note from any slide and tick &ldquo;Ask the presenter to
              contact me&rdquo; to include their email.
            </Empty>
          ) : (
            <ul className="divide-y">
              {notes.map((q) => (
                <li key={q.id} className="py-3 flex gap-3">
                  <span className="shrink-0 w-14 text-xs font-medium text-gray-500 pt-0.5">Slide {q.page}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{q.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {q.author} · {fmtDateTime(q.at)}
                      {q.replies > 0 && ` · ${q.replies} repl${q.replies === 1 ? "y" : "ies"}`}
                    </p>
                    {!isOrganizer && (
                      <div className="mt-1.5 text-sm">
                        {q.contactEmail ? (
                          <span className="inline-flex flex-wrap items-center gap-x-2">
                            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-700">
                              Wants you to contact them
                            </span>
                            <a
                              href={`mailto:${q.contactEmail}?subject=${encodeURIComponent(talk.title)}`}
                              className="text-blue-600 hover:underline break-all"
                            >
                              {q.contactEmail}
                            </a>
                          </span>
                        ) : q.introRequested ? (
                          <span className="text-xs text-gray-500">
                            Introduction requested. The organizers will connect you.
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              patch(
                                { action: "intro", commentId: q.id },
                                "intro",
                                `Sent. The organizers will introduce you to ${q.author}.`
                              )
                            }
                            disabled={!!busy}
                            className="text-xs text-blue-600 hover:underline disabled:opacity-60"
                          >
                            Ask the organizers to introduce you
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {live && !isOrganizer && (
                    <button onClick={() => goAnswer(q.page)} className="shrink-0 text-sm text-blue-600 hover:underline">
                      Reply
                    </button>
                  )}
                </li>
              ))}
              {contactOnly.map((f) => (
                <li key={f.id} className="py-3 flex gap-3">
                  <span className="shrink-0 w-14 text-xs font-medium text-gray-500 pt-0.5">Contact</span>
                  <div className="flex-1 min-w-0">
                    {f.note && <p className="text-sm text-gray-900 whitespace-pre-wrap">{f.note}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {f.name}
                      {f.organization && `, ${f.organization}`}
                      {f.role && ` (${f.role})`} · {fmtDateTime(f.at)}
                    </p>
                    {f.email && (
                      <div className="mt-1.5 text-sm">
                        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-700 mr-2">
                          Wants you to contact them
                        </span>
                        <a href={`mailto:${f.email}?subject=${encodeURIComponent(talk.title)}`} className="text-blue-600 hover:underline break-all">
                          {f.email}
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Questions */}
        <Section title="Public questions and comments">
          {questionCount === 0 ? (
            <Empty>No public questions yet.</Empty>
          ) : (
            <ul className="divide-y">
              {publicQs.map((q) => (
                <li key={q.id} className="py-3 flex gap-3">
                  <span className="shrink-0 w-14 text-xs font-medium text-gray-500 pt-0.5">Slide {q.page}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{q.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {q.author}
                      {q.byPresenter && " (you)"} · {fmtDateTime(q.at)}
                      {!q.byPresenter && (
                        <>
                          {" · "}
                          {q.replies > 0 ? `${q.replies} repl${q.replies === 1 ? "y" : "ies"}` : "not yet answered"}
                        </>
                      )}
                    </p>
                  </div>
                  {live && (
                    <button onClick={() => goAnswer(q.page)} className="shrink-0 text-sm text-blue-600 hover:underline">
                      Answer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Slide-by-slide */}
        <Section title="Slide by slide">
          {report.slides.length === 0 || report.viewers === 0 ? (
            <Empty>Nobody has opened the deck yet. This fills in as attendees view your slides.</Empty>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Views of each slide, including people coming back to it.
              </p>
              <div className="space-y-1.5">
                {report.slides.map((s) => (
                  <div key={s.page} className="flex items-center gap-3 text-xs">
                    <span className="w-14 shrink-0 text-gray-500">Slide {s.page}</span>
                    <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
                      <div className="h-full rounded bg-blue-500" style={{ width: `${(s.views / maxViews) * 100}%` }} />
                    </div>
                    <span
                      className="w-10 text-right tabular-nums text-gray-700"
                      title={`${s.views} views by ${s.viewers} ${s.viewers === 1 ? "person" : "people"}`}
                    >
                      {s.views}
                    </span>
                    <span className="w-24 text-right text-gray-500">
                      {s.questions > 0 ? `${s.questions} question${s.questions === 1 ? "" : "s"}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* Interest */}
        <Section title="Interest">
          <div className="grid md:grid-cols-3 gap-4">
            <PeopleList title="Interested" people={report.interested} />
            <PeopleList title="Attending" people={report.attending} />
            <PeopleList title="Saved to library" people={report.saved} />
          </div>
        </Section>

        {/* Edit */}
        <Section title="Talk details">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              patch({ title: editTitle, abstract: editAbstract }, "edit", "Details saved.");
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-gray-800">Title</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input mt-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800">Summary</label>
              <textarea value={editAbstract} onChange={(e) => setEditAbstract(e.target.value)} rows={4} className="input mt-1" />
            </div>
            <button disabled={!!busy} className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
              Save details
            </button>
          </form>
        </Section>

        {access.kind === "token" && (
          <p className="text-xs text-gray-500">
            Keep this page&apos;s link private: anyone who has it can edit or remove your talk. Lost it? The organizers
            can issue you a new one.
          </p>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accent ? "border-blue-200" : ""}`}>
      <p className={`text-2xl font-semibold tabular-nums ${accent ? "text-blue-700" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-amber-700 mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}

function PeopleList({ title, people }: { title: string; people: { name: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {title} ({people.length})
      </p>
      {people.length === 0 ? (
        <p className="text-sm text-gray-400">None yet</p>
      ) : (
        <ul className="text-sm text-gray-800 space-y-0.5 max-h-48 overflow-y-auto">
          {people.map((p, i) => (
            <li key={i}>{p.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
