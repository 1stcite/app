'use client';

import { useState } from 'react';
import Footer from '@/app/components/Footer';
import Link from 'next/link';

// ── Mock data ───────────────────────────────────────────────────────────────

const CONFERENCE = {
  name: "IAPRD 2025",
  date: "Friday, May 9",
  totalViewers: 847,
  totalEngagement: 14820,
  totalSaves: 312,
  totalComments: 97,
  totalCommenters: 54,
  uniqueCountries: 31,
};

type SlideData = {
  slide: number;
  dwellSec: number; // average seconds spent on this slide
};

type ViewPoint = {
  label: string;
  viewers: number;
};

type Talk = {
  id: string;
  title: string;
  author: string;
  engagement: number;
  saves: number;
  savesAttended: number;
  viewers: number;
  medianViewMin: number;
  comments: number;
  commenters: number;
  slideData: SlideData[];
  viewsOverTime: ViewPoint[];
};

type Session = {
  id: string;
  name: string;
  chair: string;
  location: string;
  color: string;
  time: string;
  talks: Talk[];
};

function makeSlides(count: number, seed: number): SlideData[] {
  return Array.from({ length: count }, (_, i) => {
    // Simulate realistic dwell: title slide short, content slides vary, conclusion short
    const base = i === 0 ? 8 : i === count - 1 ? 12 : 20;
    const variation = ((seed * 31 + i * 17) % 30);
    return { slide: i + 1, dwellSec: base + variation };
  });
}

function makeViewsOverTime(seed: number, totalViewers: number): ViewPoint[] {
  // Pattern varies by seed: some talks have early burst, some grow, some steady
  const pattern = seed % 3;
  const scale = totalViewers / 100;
  if (pattern === 0) {
    // Early burst, gradual decline (most common — live talk)
    return [
      { label: "Live", viewers: Math.round(72 * scale) },
      { label: "1h", viewers: Math.round(45 * scale) },
      { label: "Day 1", viewers: Math.round(28 * scale) },
      { label: "Day 2", viewers: Math.round(18 * scale) },
      { label: "Day 3", viewers: Math.round(12 * scale) },
      { label: "Week 2", viewers: Math.round(22 * scale) },
      { label: "Week 4", viewers: Math.round(8 * scale) },
    ];
  } else if (pattern === 1) {
    // Slow build — word of mouth / social sharing
    return [
      { label: "Live", viewers: Math.round(25 * scale) },
      { label: "1h", viewers: Math.round(30 * scale) },
      { label: "Day 1", viewers: Math.round(42 * scale) },
      { label: "Day 2", viewers: Math.round(55 * scale) },
      { label: "Day 3", viewers: Math.round(48 * scale) },
      { label: "Week 2", viewers: Math.round(65 * scale) },
      { label: "Week 4", viewers: Math.round(35 * scale) },
    ];
  } else {
    // Steady — workshop / reference material
    return [
      { label: "Live", viewers: Math.round(40 * scale) },
      { label: "1h", viewers: Math.round(35 * scale) },
      { label: "Day 1", viewers: Math.round(38 * scale) },
      { label: "Day 2", viewers: Math.round(32 * scale) },
      { label: "Day 3", viewers: Math.round(30 * scale) },
      { label: "Week 2", viewers: Math.round(28 * scale) },
      { label: "Week 4", viewers: Math.round(22 * scale) },
    ];
  }
}

const SESSIONS: Session[] = [
  {
    id: "s5", name: "Parallel Session 5: Update on Neuromodulation",
    chair: "Zoltan Mari & Jinyoung Youn", location: "Northside Ballroom", color: "#2563eb", time: "11:00 – 12:30",
    talks: [
      { id: "5a", title: "MR-guided Focused Ultrasound", author: "Gordon Baltuch", engagement: 427, saves: 28, savesAttended: 19, viewers: 312, medianViewMin: 6.8, comments: 7, commenters: 5, slideData: makeSlides(10, 1), viewsOverTime: makeViewsOverTime(1, 312) },
      { id: "5b", title: "Deep Brain Stimulation", author: "Alexandra Boogers", engagement: 243, saves: 12, savesAttended: 8, viewers: 198, medianViewMin: 5.2, comments: 4, commenters: 3, slideData: makeSlides(12, 2), viewsOverTime: makeViewsOverTime(2, 198) },
      { id: "5c", title: "Neuromodulatory Neurostimulation: TMS, tDCS, and Beyond", author: "Robert Chen", engagement: 239, saves: 14, savesAttended: 9, viewers: 187, medianViewMin: 4.9, comments: 5, commenters: 4, slideData: makeSlides(8, 3), viewsOverTime: makeViewsOverTime(3, 187) },
    ],
  },
  {
    id: "s6", name: "Parallel Session 6: Defining and Treating Atypical Parkinsonism",
    chair: "Karen Frei & Anhar Hassan", location: "Grand Ballroom – Salon D", color: "#7c3aed", time: "11:00 – 12:30",
    talks: [
      { id: "6a", title: "Differentiating PSP, MSA, and Corticobasal Syndrome", author: "Ai-Huey Tan", engagement: 496, saves: 42, savesAttended: 31, viewers: 298, medianViewMin: 7.3, comments: 16, commenters: 12, slideData: makeSlides(14, 4), viewsOverTime: makeViewsOverTime(4, 298) },
      { id: "6b", title: "Therapeutic Approaches to Atypical Parkinsonism", author: "Huw Morris", engagement: 227, saves: 15, savesAttended: 11, viewers: 174, medianViewMin: 5.1, comments: 3, commenters: 2, slideData: makeSlides(10, 5), viewsOverTime: makeViewsOverTime(5, 174) },
      { id: "6c", title: "Debate: Is Neuropathology the Gold Standard for Diagnosis?", author: "Paola Sandroni & Glenda Halliday", engagement: 429, saves: 35, savesAttended: 22, viewers: 264, medianViewMin: 8.1, comments: 14, commenters: 11, slideData: makeSlides(8, 6), viewsOverTime: makeViewsOverTime(6, 264) },
    ],
  },
  {
    id: "w3", name: "Workshop 3: Botulinum Toxin Injection Workshop",
    chair: "Marie Saint-Hilaire & Roy Alcalay", location: "Grand Ballroom – Salons A-C", color: "#059669", time: "11:00 – 12:30",
    talks: [
      { id: "w3a", title: "Clinical Utility of Botulinum Neurotoxins", author: "Alberto Albanese", engagement: 302, saves: 22, savesAttended: 14, viewers: 215, medianViewMin: 4.4, comments: 5, commenters: 4, slideData: makeSlides(10, 7), viewsOverTime: makeViewsOverTime(7, 215) },
      { id: "w3b", title: "Techniques for Muscle Localization", author: "Katharine Alter", engagement: 362, saves: 28, savesAttended: 18, viewers: 249, medianViewMin: 5.9, comments: 8, commenters: 6, slideData: makeSlides(12, 8), viewsOverTime: makeViewsOverTime(8, 249) },
      { id: "w3c", title: "Injection Demonstration Video Cases", author: "Jaroslaw Slawek & David Simpson", engagement: 642, saves: 52, savesAttended: 38, viewers: 412, medianViewMin: 9.2, comments: 18, commenters: 14, slideData: makeSlides(6, 9), viewsOverTime: makeViewsOverTime(9, 412) },
    ],
  },
];

const ALL_TALKS = SESSIONS.flatMap(s => s.talks.map(t => ({ ...t, session: s.name, sessionColor: s.color })));

// Audience over time (mock — hourly engagement during and after the session)
const AUDIENCE_TIMELINE = [
  { time: "11:00", viewers: 124 }, { time: "11:15", viewers: 287 }, { time: "11:30", viewers: 412 },
  { time: "11:45", viewers: 534 }, { time: "12:00", viewers: 621 }, { time: "12:15", viewers: 587 },
  { time: "12:30", viewers: 423 }, { time: "13:00", viewers: 198 }, { time: "14:00", viewers: 87 },
  { time: "16:00", viewers: 143 }, { time: "18:00", viewers: 98 }, { time: "20:00", viewers: 67 },
  { time: "Day 2", viewers: 234 }, { time: "Day 3", viewers: 187 }, { time: "Week 2", viewers: 312 },
  { time: "Week 4", viewers: 156 },
];

// Audience metrics segmented by field (mock — will come from ORCID data)
const AUDIENCE_METRICS = {
  all:       { label: "All Attendees",  viewers: 847, medianViewMin: 5.8, saves: 312, comments: 97, engagement: 14820 },
  physicians:{ label: "Physicians",     viewers: 489, medianViewMin: 6.4, saves: 192, comments: 58, engagement: 8940 },
  neuro:     { label: "Neuroscientists",viewers: 358, medianViewMin: 5.0, saves: 120, comments: 39, engagement: 5880 },
};

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "#2563eb" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SessionBar({ session, maxEng }: { session: Session; maxEng: number }) {
  const totalEng = session.talks.reduce((s, t) => s + t.engagement, 0);
  const totalSaves = session.talks.reduce((s, t) => s + t.saves, 0);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 truncate max-w-[55%]">{session.name.replace(/^Parallel Session \d+: |^Workshop \d+: /, '')}</span>
        <span className="text-gray-500 text-xs flex items-center gap-3">
          <span>{totalEng.toLocaleString()} eng</span>
          <span>{totalSaves} saves</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(totalEng / maxEng) * 100}%`, background: session.color }} />
      </div>
    </div>
  );
}

function EngagementChart({ data }: { data: typeof AUDIENCE_TIMELINE }) {
  const max = Math.max(...data.map(d => d.viewers));
  const w = 100 / (data.length - 1);
  const points = data.map((d, i) => `${i * w},${100 - (d.viewers / max) * 88}`).join(' ');
  const area = `0,100 ${points} 100,100`;
  return (
    <div className="relative h-40">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="eng-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#eng-grad)" />
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-gray-400 mt-1 px-1">
        {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map(d => <span key={d.time}>{d.time}</span>)}
      </div>
    </div>
  );
}

function SlideDwellBar({ slides }: { slides: SlideData[] }) {
  const maxDwell = Math.max(...slides.map(s => s.dwellSec));
  return (
    <div className="space-y-0.5">
      {slides.map(s => {
        const pct = Math.round((s.dwellSec / maxDwell) * 100);
        // Color intensity based on relative dwell
        const intensity = s.dwellSec / maxDwell;
        const color = intensity > 0.7 ? '#2563eb' : intensity > 0.4 ? '#60a5fa' : '#bfdbfe';
        return (
          <div key={s.slide} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{s.slide}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded-sm overflow-hidden">
              <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[10px] text-gray-400 w-6 text-right shrink-0">{s.dwellSec}s</span>
          </div>
        );
      })}
      <p className="text-[10px] text-gray-400 mt-1">Average seconds per viewer on each slide</p>
    </div>
  );
}

function TalkViewsChart({ data }: { data: ViewPoint[] }) {
  const max = Math.max(...data.map(d => d.viewers), 1);
  const w = 100 / (data.length - 1);
  const points = data.map((d, i) => `${i * w},${100 - (d.viewers / max) * 85}`).join(' ');
  const area = `0,100 ${points} 100,100`;

  // Detect pattern
  const firstHalf = data.slice(0, Math.ceil(data.length / 2)).reduce((s, d) => s + d.viewers, 0);
  const secondHalf = data.slice(Math.ceil(data.length / 2)).reduce((s, d) => s + d.viewers, 0);
  const pattern = secondHalf > firstHalf * 1.2 ? "Growing over time" :
                  firstHalf > secondHalf * 1.5 ? "Early burst, tapering off" : "Steady engagement";

  return (
    <div>
      <div className="relative h-28">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="talk-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#talk-grad)" />
          <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-gray-400 px-0.5">
          {data.map(d => <span key={d.label}>{d.label}</span>)}
        </div>
      </div>
      <p className="text-[10px] text-gray-500 mt-2 italic">{pattern}</p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'talks' | 'audience'>('overview');
  const [expandedSession, setExpandedSession] = useState<string | null>('s6');
  const [expandedTalk, setExpandedTalk] = useState<string | null>(null);

  const maxSessionEng = Math.max(...SESSIONS.map(s => s.talks.reduce((sum, t) => sum + t.engagement, 0)));
  const sortedByEng = [...ALL_TALKS].sort((a, b) => b.engagement - a.engagement);
  const sortedBySaves = [...ALL_TALKS].sort((a, b) => b.saves - a.saves);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-blue-600 text-sm hover:underline">← Presentations</Link>
            <span className="text-gray-300">|</span>
            <span className="font-semibold text-gray-900 text-sm">{CONFERENCE.name}</span>
            <span className="text-gray-400 text-sm">{CONFERENCE.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/methodology" className="text-xs text-blue-600 hover:underline">Methodology</Link>
            <span className="text-gray-300">·</span>
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">⚡ Sample data</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Conference Insights</h1>
          <p className="text-gray-500 text-sm mb-6">Engagement analytics for {CONFERENCE.name}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Engagement" value={CONFERENCE.totalEngagement} sub="scheduled + saves×2 + comments×3" color="#2563eb" />
            <StatCard label="Saves" value={CONFERENCE.totalSaves} sub="talks saved to library" color="#7c3aed" />
            <StatCard label="Comments" value={CONFERENCE.totalComments} sub={`from ${CONFERENCE.totalCommenters} commenters`} color="#059669" />
            <StatCard label="Countries" value={CONFERENCE.uniqueCountries} sub="reached globally" color="#d97706" />
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['overview', 'talks', 'audience'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={['px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
                activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'].join(' ')}>
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Audience over time */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Audience Over Time</h2>
              <p className="text-xs text-gray-500 mb-4">Unique viewers by time period — live session through post-conference archive access</p>
              <EngagementChart data={AUDIENCE_TIMELINE} />
            </div>

            {/* Session comparison */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Session Comparison</h2>
              <div className="space-y-4">
                {SESSIONS.map(s => <SessionBar key={s.id} session={s} maxEng={maxSessionEng} />)}
              </div>
            </div>

            {/* Top talks by engagement */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Talks by Engagement</h2>
              <div className="space-y-3">
                {sortedByEng.slice(0, 5).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                      <div className="text-xs text-gray-500">{t.author}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-semibold text-gray-900">{t.engagement}</div>
                      <div className="text-xs text-gray-400">{t.saves} saves</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top talks by saves */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Most Saved Talks</h2>
              <div className="space-y-3">
                {sortedBySaves.slice(0, 5).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                      <div className="text-xs text-gray-500">{t.author}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-semibold text-gray-900">{t.saves}</div>
                      <div className="text-xs text-gray-400">{t.savesAttended} attended · {t.saves - t.savesAttended} archive</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TALKS ── */}
        {activeTab === 'talks' && (
          <div className="space-y-3">
            {SESSIONS.map(session => {
              const isExpanded = expandedSession === session.id;
              return (
                <div key={session.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <button type="button" className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900">{session.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{session.chair} · {session.location} · {session.time}</div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm font-medium text-gray-700">{session.talks.reduce((s, t) => s + t.engagement, 0).toLocaleString()} eng</span>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t">
                      <div className="grid grid-cols-[1fr_80px_80px_70px_70px] gap-3 px-5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b bg-gray-50">
                        <div>Talk</div>
                        <div className="text-center">Engagement</div>
                        <div className="text-center">Saves</div>
                        <div className="text-center">Viewers</div>
                        <div className="text-center">Comments</div>
                      </div>
                      {session.talks.map(talk => {
                        const isTalkExpanded = expandedTalk === talk.id;
                        return (
                          <div key={talk.id}>
                            <button type="button"
                              className="w-full grid grid-cols-[1fr_80px_80px_70px_70px] gap-3 px-5 py-3 items-center hover:bg-blue-50/30 transition-colors text-left"
                              onClick={() => setExpandedTalk(isTalkExpanded ? null : talk.id)}>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{talk.title}</div>
                                <div className="text-xs text-gray-500">{talk.author}</div>
                              </div>
                              <div className="text-center text-lg font-semibold text-gray-900">{talk.engagement}</div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-gray-900">{talk.saves}</div>
                                <div className="text-[10px] text-gray-400">{talk.savesAttended} att</div>
                              </div>
                              <div className="text-center text-sm text-gray-600">{talk.viewers}</div>
                              <div className="text-center text-sm text-gray-600">{talk.comments}</div>
                            </button>

                            {isTalkExpanded && (
                              <div className="px-5 pb-5 pt-2 border-t bg-gray-50/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Slide dwell time */}
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Time Spent per Slide</div>
                                    <SlideDwellBar slides={talk.slideData} />
                                  </div>

                                  {/* Views over time */}
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Views Over Time</div>
                                    <TalkViewsChart data={talk.viewsOverTime} />
                                  </div>
                                </div>
                                <div className="grid grid-cols-5 gap-4 mt-4 pt-3 border-t text-center text-xs">
                                  <div><div className="font-semibold text-gray-900">{talk.viewers}</div><div className="text-gray-400">Viewers</div></div>
                                  <div><div className="font-semibold text-gray-900">{talk.medianViewMin} m</div><div className="text-gray-400">Median time</div></div>
                                  <div><div className="font-semibold text-gray-900">{talk.commenters}</div><div className="text-gray-400">Commenters</div></div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{talk.saves}</div>
                                    <div className="text-gray-400">Saves</div>
                                    <div className="text-[10px] text-emerald-600">{talk.savesAttended} attended</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{Math.round(talk.saves / talk.viewers * 100)}%</div>
                                    <div className="text-gray-400">Save rate</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── AUDIENCE ── */}
        {activeTab === 'audience' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Audience Metrics by Field</h2>
              <p className="text-xs text-gray-500 mb-5">Based on ORCID publication profiles. Field classification derived from indexed publication keywords.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">Metric</th>
                      {Object.values(AUDIENCE_METRICS).map(g => (
                        <th key={g.label} className="pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{g.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {([
                      ['Viewers',         (g: typeof AUDIENCE_METRICS.all) => g.viewers.toLocaleString()],
                      ['Median view time',(g: typeof AUDIENCE_METRICS.all) => `${g.medianViewMin} m`],
                      ['Saves',           (g: typeof AUDIENCE_METRICS.all) => String(g.saves)],
                      ['Save rate',       (g: typeof AUDIENCE_METRICS.all) => `${Math.round(g.saves / g.viewers * 100)}%`],
                      ['Comments',        (g: typeof AUDIENCE_METRICS.all) => String(g.comments)],
                      ['Engagement Index',(g: typeof AUDIENCE_METRICS.all) => g.engagement.toLocaleString()],
                    ] as [string, (g: typeof AUDIENCE_METRICS.all) => string][]).map(([label, fn]) => (
                      <tr key={label}>
                        <td className={`py-2.5 pr-4 ${label === 'Engagement Index' ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>{label}</td>
                        {Object.values(AUDIENCE_METRICS).map(g => (
                          <td key={g.label} className={`py-2.5 px-4 text-right font-medium ${label === 'Engagement Index' ? 'text-blue-700' : 'text-gray-900'}`}>{fn(g)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">What This Tells the Program Committee</h2>
              <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                <p>
                  Physicians spend {AUDIENCE_METRICS.physicians.medianViewMin} minutes per talk versus {AUDIENCE_METRICS.neuro.medianViewMin} for
                  neuroscientists, and save at a {Math.round(AUDIENCE_METRICS.physicians.saves / AUDIENCE_METRICS.physicians.viewers * 100)}% rate
                  versus {Math.round(AUDIENCE_METRICS.neuro.saves / AUDIENCE_METRICS.neuro.viewers * 100)}%. The higher save rate among physicians
                  suggests clinical content has stronger lasting value for that audience.
                </p>
                <p>
                  When save rates or comment rates diverge significantly on specific talks, it signals content
                  that resonates differently by field — useful for planning tracks, joint sessions, and
                  translational workshops that bridge clinical practice and basic science.
                </p>
                <p>
                  The Engagement Index ({AUDIENCE_METRICS.physicians.engagement.toLocaleString()} physicians
                  vs {AUDIENCE_METRICS.neuro.engagement.toLocaleString()} neuroscientists) is a composite that
                  combines scheduled attendance, saves, and comments into a single attention measure.
                  It appears last because it is derived from the counts above.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-sm p-6 text-white">
              <h2 className="text-sm font-semibold mb-3">Coming Next</h2>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• <strong className="text-white">Per-talk field breakdown</strong> — which talks drew disproportionate physician vs neuroscientist engagement.</p>
                <p>• <strong className="text-white">Career stage segmentation</strong> — students, early-career researchers, and faculty as a separate lens.</p>
                <p>• <strong className="text-white">Geographic analysis</strong> — regional engagement patterns by field and career stage.</p>
              </div>
            </div>
          </div>
        )}

      <Footer />
      </div>
    </div>
  );
}
