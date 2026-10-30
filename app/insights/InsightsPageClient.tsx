'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Footer from '@/app/components/Footer';
import { useConference } from '@/app/lib/conferenceContext';
import type { Insights, InsightsDay, InsightsSession, InsightsTalk } from '@/app/lib/insights';

// One hue for magnitude; a lighter step of the same hue for context
const BLUE = '#2563eb';
const BLUE_SOFT = '#93b4f5';
const VIOLET = '#7c3aed'; // follow-ups: the one number with its own identity on this page

const fmt = (n: number) => n.toLocaleString('en-US');
const pct = (x: number) => `${Math.round(x * 100)}%`;
const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }) : '';

export default function InsightsPageClient() {
  const conf = useConference();
  const [when, setWhen] = useState<'before' | 'after'>('before');
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (w: 'before' | 'after') => {
    setError(null);
    const r = await fetch(`/api/admin/insights?when=${w}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j?.error || 'Could not load insights.');
      return;
    }
    setData(j);
  }, []);

  useEffect(() => {
    load(when);
  }, [when, load]);
  const isSample = data?.mode === 'sample';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 space-y-6">
        <Link href="/" className="inline-block text-sm text-blue-600 hover:underline">
          ← Back to the conference
        </Link>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {conf.logo && (
              <Link href="/" title="Back to the conference">
                <img src={conf.logo} alt="" className="h-12 w-auto object-contain" />
              </Link>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Organizer insights</p>
              <h1 className="text-2xl font-bold text-gray-900">{conf.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSample && (
              <div className="inline-flex rounded-lg bg-gray-200 p-0.5 text-sm font-medium" role="tablist" aria-label="When">
                {(['before', 'after'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    role="tab"
                    aria-selected={when === w}
                    onClick={() => setWhen(w)}
                    className={`px-3 py-1.5 rounded-md ${when === w ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {w === 'before' ? 'Before' : 'After'}
                  </button>
                ))}
              </div>
            )}
            <Link href="/admin/presenters" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
              Presenters &amp; access →
            </Link>
          </div>
        </div>

        {isSample && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Sample data</strong> for your program&apos;s talks and sessions, as you would see it the morning the
            conference opens (Before) and a month after it ends (After).
          </div>
        )}

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!data && !error && <p className="text-gray-500">Loading…</p>}

        {data && <Dashboard data={data} />}
      </div>
      <Footer />
    </div>
  );
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

const PHASE_LABEL = { before: 'Before the conference', during: 'During the conference', after: 'After the conference' } as const;

function Dashboard({ data }: { data: Insights }) {
  const t = data.totals;
  const phase = data.phase;
  const lastDay = fmtDate(data.conferenceDates.end);
  const firstDay = fmtDate(data.conferenceDates.start);

  const nothingYet =
    data.mode === 'live' && t.people === 0 && t.questions === 0 && t.followups === 0 && t.stars === 0 && t.scheduled === 0;

  return (
    <>
      {/* Where we are (live data; the demo toggle already says it) */}
      {data.mode === 'live' && <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="rounded-full bg-gray-900 text-white px-3 py-1 text-xs font-semibold">{PHASE_LABEL[phase]}</span>
        <span className="text-sm text-gray-600">
          {phase === 'after'
            ? lastDay
              ? `Conference ended ${lastDay}`
              : ''
            : `As of ${fmtWhen(data.asOf)}`}
          {phase === 'during' && ` · ${t.talksDone} of ${t.talks} talks given`}
          {phase === 'before' && firstDay && ` · conference starts ${firstDay}`}
        </span>
      </div>}

      {nothingYet ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-600">
          No attendee activity yet. This fills in as people open talks, mark interest, ask questions and ask presenters
          to contact them.
        </div>
      ) : (
        <>
          {/* Headline numbers */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile value={fmt(t.people)} label="People who opened a talk" sub={`${fmt(t.deckOpens)} deck opens in all`} />
            <Tile
              value={fmt(t.scheduled)}
              label="Talks added to schedules"
              sub={`${fmt(t.stars)} stars · ${fmt(t.saves)} saves`}
            />
            <Tile value={fmt(t.questions)} label="Questions on slides" />
            {phase === 'after' ? (
              <Tile
                accent
                value={fmt(t.followups)}
                label="Attendees asking presenters to contact them"
                sub={`across ${fmt(t.talksWithFollowups)} of ${fmt(t.talks)} talks`}
              />
            ) : (
              <Tile accent value={fmt(t.followups)} label="Contact requests to presenters" />
            )}
          </section>

          {/* Over time */}
          <section className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <h2 className="text-base font-semibold text-gray-900">Attendee engagement over time</h2>
              {phase === 'after' && (
                <p className="text-sm text-gray-600">
                  After the conference: <strong className="text-gray-900">{pct(t.activityAfterShare)}</strong> of activity
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4">Slide views, questions and contact requests per day</p>
            <DayChart days={data.days} showNow={data.mode === 'live'} />
          </section>

          {phase === 'before' && (
            <div className="grid lg:grid-cols-5 gap-6">
              <section className="lg:col-span-3 rounded-xl border bg-white p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Most anticipated talks</h2>
                <p className="text-xs text-gray-500 mb-3">Ranked by schedules, stars and saves</p>
                <InterestTable rows={data.upcomingTalks} />
              </section>
              <section className="lg:col-span-2 rounded-xl border bg-white p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Expected attendance by session</h2>
                <p className="text-xs text-gray-500 mb-3">People who added a talk in the session to their schedule</p>
                <Sessions rows={data.sessions} metric="scheduled" />
              </section>
            </div>
          )}

          {phase === 'during' && (
            <>
              <div className="grid lg:grid-cols-2 gap-6">
                <section className="rounded-xl border bg-white p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Talks given so far</h2>
                  <p className="text-xs text-gray-500 mb-3">Ranked by contact requests, then people reached</p>
                  <EngagementTable rows={data.topTalks} empty="No talks have finished yet." />
                </section>
                <section className="rounded-xl border bg-white p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Coming up: most anticipated</h2>
                  <p className="text-xs text-gray-500 mb-3">Ranked by schedules, stars and saves</p>
                  <InterestTable rows={data.upcomingTalks} />
                </section>
              </div>
              <section className="rounded-xl border bg-white p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Sessions</h2>
                <p className="text-xs text-gray-500 mb-3">
                  Finished sessions by deck opens; upcoming sessions by people who scheduled them
                </p>
                <Sessions rows={data.sessions} metric="auto" />
              </section>
            </>
          )}

          {phase === 'after' && (
            <div className="grid lg:grid-cols-5 gap-6">
              <section className="lg:col-span-3 rounded-xl border bg-white p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Top talks</h2>
                <p className="text-xs text-gray-500 mb-3">Ranked by contact requests, then people reached</p>
                <EngagementTable rows={data.topTalks} empty="No talks yet." />
              </section>
              <section className="lg:col-span-2 rounded-xl border bg-white p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Reach by session</h2>
                <p className="text-xs text-gray-500 mb-3">
                  Deck opens per session · {pct(t.outsideSessionShare)} by people not in the session
                </p>
                <Sessions rows={data.sessions} metric="viewers" />
              </section>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-gray-500">
        Counts only. Names and contact details of attendees who ask questions or ask to be contacted go to the
        presenters, not to organizers.
      </p>
    </>
  );
}

function Tile({ value, label, sub, accent }: { value: string; label: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accent ? 'border-violet-200' : ''}`}>
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums" style={{ color: accent ? VIOLET : '#111827' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function DayChart({ days, showNow }: { days: InsightsDay[]; showNow: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.activity));
  const H = 180;
  const nowIdx = days.findIndex((d) => d.future) - 1;
  const during = days.map((d, i) => (d.phase === 'during' ? i : -1)).filter((i) => i >= 0);
  const firstDuring = during[0] ?? -1;
  const lastDuring = during[during.length - 1] ?? -1;
  const ticks = useMemo(() => {
    const out: number[] = [0];
    if (firstDuring >= 0) out.push(firstDuring);
    for (const off of [7, 14, 21, 30]) {
      const i = lastDuring + off;
      if (lastDuring >= 0 && i < days.length) out.push(i);
    }
    return [...new Set(out)];
  }, [days.length, firstDuring, lastDuring]);

  return (
    <div className="relative">
      <div className="relative flex items-end gap-[2px]" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        {/* conference days band */}
        {firstDuring >= 0 && (
          <div
            className="absolute inset-y-0 rounded bg-blue-50"
            style={{
              left: `${(firstDuring / days.length) * 100}%`,
              width: `${((lastDuring - firstDuring + 1) / days.length) * 100}%`,
            }}
          >
            <span className="absolute -top-0.5 left-1 text-[10px] font-medium text-blue-700">Conference</span>
          </div>
        )}
        {/* now marker */}
        {showNow && nowIdx >= 0 && nowIdx < days.length - 1 && (
          <div
            className="absolute inset-y-0 border-l-2 border-dashed border-gray-400"
            style={{ left: `${((nowIdx + 1) / days.length) * 100}%` }}
          >
            <span className="absolute -top-0.5 left-1 text-[10px] font-medium text-gray-600 whitespace-nowrap">Now</span>
          </div>
        )}
        {days.map((d, i) => (
          <div
            key={d.date}
            className={`relative flex-1 h-full flex items-end ${d.future ? 'border-b border-dashed border-gray-200' : ''}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            tabIndex={0}
            aria-label={`${d.label}: ${d.activity} actions`}
          >
            <div
              className="w-full rounded-t-[3px]"
              style={{
                height: `${Math.max(d.activity > 0 ? 2 : 0, (d.activity / max) * (H - 16))}px`,
                background: d.phase === 'before' ? BLUE_SOFT : BLUE,
                opacity: hover === null || hover === i ? 1 : 0.55,
              }}
            />
          </div>
        ))}
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-white px-2 py-1 text-xs shadow-sm whitespace-nowrap"
            style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
          >
            <span className="font-medium text-gray-900">{days[hover].label}</span>
            <span className="text-gray-600">
              {days[hover].future ? ' · not yet' : ` · ${fmt(days[hover].activity)} actions`}
            </span>
          </div>
        )}
      </div>
      {/* axis */}
      <div className="relative h-5 mt-1 border-t border-gray-200">
        {ticks.map((i) => (
          <span
            key={i}
            className="absolute top-1 -translate-x-1/2 text-[11px] text-gray-500 whitespace-nowrap"
            style={{ left: `${((i + 0.5) / days.length) * 100}%` }}
          >
            {i > lastDuring && lastDuring >= 0 ? `+${i - lastDuring}d` : days[i]?.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TalkCell({ r }: { r: InsightsTalk }) {
  return (
    <td className="py-2 pr-3">
      <a href={`/view/${r.id}`} className="font-medium text-gray-900 hover:underline line-clamp-2">
        {r.title}
      </a>
      <div className="text-xs text-gray-500 line-clamp-1">
        {r.author}
        {r.sessionName && <> · {r.sessionName}</>}
        {r.startsAt && !r.done && <> · {fmtWhen(r.startsAt)}</>}
      </div>
    </td>
  );
}

function EngagementTable({ rows, empty }: { rows: InsightsTalk[]; empty: string }) {
  const maxF = Math.max(1, ...rows.map((r) => r.followups));
  if (rows.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
            <th className="py-2 pr-3">Talk</th>
            <th className="py-2 pr-3 text-right">People</th>
            <th className="py-2 pr-3 text-right">Questions</th>
            <th className="py-2 pr-3 w-36">Contact requests</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 align-top">
              <TalkCell r={r} />
              <td className="py-2 pr-3 text-right tabular-nums text-gray-800">{fmt(r.viewers)}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-gray-800">{fmt(r.questions)}</td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2" title={`${r.followups} contact requests`}>
                  <div className="h-2.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(r.followups / maxF) * 100}%`, background: VIOLET }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-gray-800">{fmt(r.followups)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InterestTable({ rows }: { rows: InsightsTalk[] }) {
  const max = Math.max(1, ...rows.map((r) => r.scheduled));
  if (rows.length === 0) return <p className="text-sm text-gray-500">Every talk has been given.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
            <th className="py-2 pr-3">Talk</th>
            <th className="py-2 pr-3 w-36">Scheduled</th>
            <th className="py-2 pr-3 text-right">Stars</th>
            <th className="py-2 pr-3 text-right">Saves</th>
            <th className="py-2 pr-3 text-right">Deck opens</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 align-top">
              <TalkCell r={r} />
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2" title={`${r.scheduled} people added this to their schedule`}>
                  <div className="h-2.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(r.scheduled / max) * 100}%`, background: BLUE }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-gray-800">{fmt(r.scheduled)}</span>
                </div>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-gray-800">{fmt(r.stars)}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-gray-800">{fmt(r.saves)}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-gray-800">{fmt(r.viewers)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** metric "auto": finished sessions by deck opens, upcoming ones by schedules. */
function Sessions({ rows, metric }: { rows: InsightsSession[]; metric: 'viewers' | 'scheduled' | 'auto' }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">No sessions.</p>;
  const value = (s: InsightsSession) =>
    metric === 'viewers' ? s.viewers : metric === 'scheduled' ? s.scheduled : s.done ? s.viewers : s.scheduled;
  const maxDone = Math.max(1, ...rows.filter((s) => metric !== 'auto' || s.done).map(value));
  const maxUp = Math.max(1, ...rows.filter((s) => metric !== 'auto' || !s.done).map(value));
  return (
    <ul className="space-y-3">
      {rows.map((s) => {
        const byViews = metric === 'viewers' || (metric === 'auto' && s.done);
        const max = metric === 'auto' ? (s.done ? maxDone : maxUp) : Math.max(maxDone, maxUp);
        const v = value(s);
        return (
          <li key={s.name}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-gray-900 line-clamp-1">
                {s.name}
                {metric === 'auto' && (
                  <span className={`ml-2 text-[11px] font-medium ${s.done ? 'text-gray-500' : 'text-blue-700'}`}>
                    {s.done ? 'finished' : 'upcoming'}
                  </span>
                )}
              </span>
              <span className="tabular-nums text-gray-800 shrink-0">
                {fmt(v)} <span className="text-xs text-gray-500">{byViews ? 'opens' : 'scheduled'}</span>
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(v / max) * 100}%`, background: byViews ? BLUE : BLUE_SOFT }}
              />
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {s.talks} talk{s.talks === 1 ? '' : 's'} ·{' '}
              {byViews
                ? `${fmt(s.questions)} questions · ${fmt(s.followups)} contact requests`
                : `${fmt(s.stars)} stars · ${fmt(s.saves)} saves`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
