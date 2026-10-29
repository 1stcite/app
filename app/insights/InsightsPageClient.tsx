'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Footer from '@/app/components/Footer';
import { useConference } from '@/app/lib/conferenceContext';
import type { Insights, InsightsDay } from '@/app/lib/insights';

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
  const [mode, setMode] = useState<'sample' | 'live'>('sample');
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (m: 'sample' | 'live') => {
    setError(null);
    const r = await fetch(`/api/admin/insights?mode=${m}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j?.error || 'Could not load insights.');
      return;
    }
    setData(j);
  }, []);

  useEffect(() => {
    load(mode);
  }, [mode, load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {conf.logo && <img src={conf.logo} alt="" className="h-12 w-auto object-contain" />}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Organizer insights</p>
              <h1 className="text-2xl font-bold text-gray-900">{conf.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg bg-gray-200 p-0.5 text-sm font-medium" role="tablist" aria-label="Data source">
              {(['sample', 'live'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-md ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {m === 'sample' ? 'Sample data' : 'Live data'}
                </button>
              ))}
            </div>
            <Link href="/admin/presenters" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
              Presenters &amp; access →
            </Link>
          </div>
        </div>

        {mode === 'sample' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Sample data.</strong> These numbers are generated from your program&apos;s real talks and sessions
            to show what you&apos;ll see after the conference. Switch to <em>Live data</em> for actual activity.
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

function Dashboard({ data }: { data: Insights }) {
  const t = data.totals;
  const lastDay = fmtDate(data.conferenceDates.end);

  if (data.mode === 'live' && t.people === 0 && t.questions === 0 && t.followups === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-gray-600">
        No attendee activity yet. This fills in as people open talks, ask questions and request follow-ups.
      </div>
    );
  }

  return (
    <>
      {/* Headline numbers */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          accent
          value={fmt(t.followups)}
          label="Follow-up requests to presenters"
          sub={`across ${fmt(t.talksWithFollowups)} of ${fmt(t.talks)} talks`}
        />
        <Tile value={fmt(t.people)} label="People who opened a talk" sub={`${fmt(t.deckOpens)} deck opens in all`} />
        <Tile
          value={pct(t.outsideSessionShare)}
          label="Of deck opens by people not in the room"
          sub="talks reaching beyond their session"
        />
        <Tile value={fmt(t.questions)} label="Questions on slides" sub={`${fmt(t.saves)} talks saved to libraries`} />
      </section>

      {/* Long tail */}
      <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="text-base font-semibold text-gray-900">
            {lastDay ? `The conference didn't end on ${lastDay}` : 'Activity by day'}
          </h2>
          <p className="text-sm text-gray-600">
            <strong className="text-gray-900">{pct(t.activityAfterShare)}</strong> of activity came after the conference,
            on {t.daysActiveAfter} of the 30 days that followed
          </p>
        </div>
        <p className="text-xs text-gray-500 mb-4">Slide views, questions and follow-up requests per day</p>
        <DayChart days={data.days} />
      </section>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Top talks */}
        <section className="lg:col-span-3 rounded-xl border bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Talks that started conversations</h2>
          <p className="text-xs text-gray-500 mb-3">Ranked by follow-up requests, then people reached</p>
          <TopTalks data={data} />
        </section>

        {/* Sessions */}
        <section className="lg:col-span-2 rounded-xl border bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Reach by session</h2>
          <p className="text-xs text-gray-500 mb-3">Deck opens per session, with questions and follow-ups</p>
          <Sessions data={data} />
        </section>
      </div>

      <p className="text-xs text-gray-500">
        Counts only. Names and contact details of attendees who ask questions or request follow-ups go to the
        presenters, not to organizers.
      </p>
    </>
  );
}

function Tile({ value, label, sub, accent }: { value: string; label: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accent ? 'border-violet-200' : ''}`}>
      <p className="text-3xl font-semibold tabular-nums" style={{ color: accent ? VIOLET : '#111827' }}>
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function DayChart({ days }: { days: InsightsDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.activity));
  const H = 180;
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
        {days.map((d, i) => (
          <div
            key={d.date}
            className="relative flex-1 h-full flex items-end"
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
            <span className="text-gray-600"> · {fmt(days[hover].activity)} actions</span>
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

function TopTalks({ data }: { data: Insights }) {
  const rows = data.topTalks;
  const maxF = Math.max(1, ...rows.map((r) => r.followups));
  if (rows.length === 0) return <p className="text-sm text-gray-500">No talks yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
            <th className="py-2 pr-3">Talk</th>
            <th className="py-2 pr-3 text-right">People</th>
            <th className="py-2 pr-3 text-right">Questions</th>
            <th className="py-2 pr-3 w-40">Follow-ups</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 align-top">
              <td className="py-2 pr-3">
                <a href={`/view/${r.id}`} className="font-medium text-gray-900 hover:underline line-clamp-2">
                  {r.title}
                </a>
                <div className="text-xs text-gray-500 line-clamp-1">
                  {r.author}
                  {r.sessionName && <> · {r.sessionName}</>}
                </div>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-gray-800">{fmt(r.viewers)}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-gray-800">{fmt(r.questions)}</td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2" title={`${r.followups} follow-up requests`}>
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

function Sessions({ data }: { data: Insights }) {
  const rows = data.sessions;
  const max = Math.max(1, ...rows.map((r) => r.viewers));
  if (rows.length === 0) return <p className="text-sm text-gray-500">No sessions.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((s) => (
        <li key={s.name} title={`${s.name}: ${s.viewers} deck opens, ${s.questions} questions, ${s.followups} follow-ups`}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-gray-900 line-clamp-1">{s.name}</span>
            <span className="tabular-nums text-gray-800 shrink-0">{fmt(s.viewers)}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(s.viewers / max) * 100}%`, background: BLUE }} />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {s.talks} talk{s.talks === 1 ? '' : 's'} · {fmt(s.questions)} questions · {fmt(s.followups)} follow-ups
          </p>
        </li>
      ))}
    </ul>
  );
}
