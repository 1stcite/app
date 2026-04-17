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
  dwell: number;
  comments: number;
  questions: number;
};

type SentimentSummary = {
  praise: number;
  neutral: number;
  critical: number;
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
  sentiment: SentimentSummary;
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
    const h = ((seed * 31 + i * 17) % 100);
    const c = ((seed * 13 + i * 23) % 7);
    const q = Math.min(c, ((seed + i * 11) % 4));
    return { slide: i + 1, dwell: 30 + h, comments: c, questions: q };
  });
}

function makeSentiment(seed: number, total: number): SentimentSummary {
  const p = Math.round(total * (0.4 + (seed % 5) * 0.08));
  const c = Math.round(total * (0.05 + (seed % 3) * 0.05));
  return { praise: p, neutral: total - p - c, critical: c };
}

const SESSIONS: Session[] = [
  {
    id: "s5", name: "Parallel Session 5: Update on Neuromodulation",
    chair: "Zoltan Mari & Jinyoung Youn", location: "Northside Ballroom", color: "#2563eb", time: "11:00 – 12:30",
    talks: [
      { id: "5a", title: "MR-guided Focused Ultrasound", author: "Gordon Baltuch", engagement: 427, saves: 28, savesAttended: 19, viewers: 312, medianViewMin: 6.8, comments: 7, commenters: 5, slideData: makeSlides(10, 1), sentiment: makeSentiment(1, 7) },
      { id: "5b", title: "Deep Brain Stimulation", author: "Alexandra Boogers", engagement: 243, saves: 12, savesAttended: 8, viewers: 198, medianViewMin: 5.2, comments: 4, commenters: 3, slideData: makeSlides(12, 2), sentiment: makeSentiment(2, 4) },
      { id: "5c", title: "Neuromodulatory Neurostimulation: TMS, tDCS, and Beyond", author: "Robert Chen", engagement: 239, saves: 14, savesAttended: 9, viewers: 187, medianViewMin: 4.9, comments: 5, commenters: 4, slideData: makeSlides(8, 3), sentiment: makeSentiment(3, 5) },
    ],
  },
  {
    id: "s6", name: "Parallel Session 6: Defining and Treating Atypical Parkinsonism",
    chair: "Karen Frei & Anhar Hassan", location: "Grand Ballroom – Salon D", color: "#7c3aed", time: "11:00 – 12:30",
    talks: [
      { id: "6a", title: "Differentiating PSP, MSA, and Corticobasal Syndrome", author: "Ai-Huey Tan", engagement: 496, saves: 42, savesAttended: 31, viewers: 298, medianViewMin: 7.3, comments: 16, commenters: 12, slideData: makeSlides(14, 4), sentiment: makeSentiment(4, 16) },
      { id: "6b", title: "Therapeutic Approaches to Atypical Parkinsonism", author: "Huw Morris", engagement: 227, saves: 15, savesAttended: 11, viewers: 174, medianViewMin: 5.1, comments: 3, commenters: 2, slideData: makeSlides(10, 5), sentiment: makeSentiment(5, 3) },
      { id: "6c", title: "Debate: Is Neuropathology the Gold Standard for Diagnosis?", author: "Paola Sandroni & Glenda Halliday", engagement: 429, saves: 35, savesAttended: 22, viewers: 264, medianViewMin: 8.1, comments: 14, commenters: 11, slideData: makeSlides(8, 6), sentiment: makeSentiment(6, 14) },
    ],
  },
  {
    id: "w3", name: "Workshop 3: Botulinum Toxin Injection Workshop",
    chair: "Marie Saint-Hilaire & Roy Alcalay", location: "Grand Ballroom – Salons A-C", color: "#059669", time: "11:00 – 12:30",
    talks: [
      { id: "w3a", title: "Clinical Utility of Botulinum Neurotoxins", author: "Alberto Albanese", engagement: 302, saves: 22, savesAttended: 14, viewers: 215, medianViewMin: 4.4, comments: 5, commenters: 4, slideData: makeSlides(10, 7), sentiment: makeSentiment(7, 5) },
      { id: "w3b", title: "Techniques for Muscle Localization", author: "Katharine Alter", engagement: 362, saves: 28, savesAttended: 18, viewers: 249, medianViewMin: 5.9, comments: 8, commenters: 6, slideData: makeSlides(12, 8), sentiment: makeSentiment(8, 8) },
      { id: "w3c", title: "Injection Demonstration Video Cases", author: "Jaroslaw Slawek & David Simpson", engagement: 642, saves: 52, savesAttended: 38, viewers: 412, medianViewMin: 9.2, comments: 18, commenters: 14, slideData: makeSlides(6, 9), sentiment: makeSentiment(9, 18) },
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

const AUDIENCE_METRICS = {
  all: { label: "All Attendees", viewers: 847, engagement: 14820, saves: 312, comments: 97, medianViewMin: 5.8 },
  senior: { label: "Senior (10+ yrs)", viewers: 312, engagement: 6240, saves: 148, comments: 52, medianViewMin: 7.2 },
  junior: { label: "Junior (<10 yrs)", viewers: 535, engagement: 8580, saves: 164, comments: 45, medianViewMin: 4.9 },
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

function SlideCommentBar({ slides }: { slides: SlideData[] }) {
  const maxComments = Math.max(...slides.map(s => s.comments), 1);
  return (
    <div className="space-y-0.5">
      {slides.map(s => (
        <div key={s.slide} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{s.slide}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded-sm overflow-hidden flex">
            {(s.comments - s.questions) > 0 && (
              <div className="h-full bg-blue-400" style={{ width: `${((s.comments - s.questions) / maxComments) * 100}%` }} />
            )}
            {s.questions > 0 && (
              <div className="h-full bg-amber-400" style={{ width: `${(s.questions / maxComments) * 100}%` }} />
            )}
          </div>
          <span className="text-[10px] text-gray-400 w-3 text-right shrink-0">{s.comments || ''}</span>
        </div>
      ))}
      <div className="flex gap-3 mt-2">
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-sm bg-blue-400" /> Comments</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Questions</span>
      </div>
    </div>
  );
}

function SentimentBar({ sentiment }: { sentiment: SentimentSummary }) {
  const total = sentiment.praise + sentiment.neutral + sentiment.critical;
  if (total === 0) return null;
  return (
    <div>
      <div className="flex h-5 rounded-full overflow-hidden">
        {sentiment.praise > 0 && (
          <div className="bg-emerald-400 flex items-center justify-center text-[10px] text-white font-medium"
            style={{ width: `${(sentiment.praise / total) * 100}%` }}>{sentiment.praise}</div>
        )}
        {sentiment.neutral > 0 && (
          <div className="bg-gray-300 flex items-center justify-center text-[10px] text-gray-700 font-medium"
            style={{ width: `${(sentiment.neutral / total) * 100}%` }}>{sentiment.neutral}</div>
        )}
        {sentiment.critical > 0 && (
          <div className="bg-red-400 flex items-center justify-center text-[10px] text-white font-medium"
            style={{ width: `${(sentiment.critical / total) * 100}%` }}>{sentiment.critical}</div>
        )}
      </div>
      <div className="flex gap-3 mt-1.5">
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Praise</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> Neutral</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Critical</span>
      </div>
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
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Comments by Slide</div>
                                    <SlideCommentBar slides={talk.slideData} />
                                  </div>
                                  <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-white/50">
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="text-xs font-semibold text-gray-700">Comment Sentiment</span>
                                      <span className="text-[9px] font-semibold bg-red-100 text-red-800 px-1.5 py-0.5 rounded uppercase">Author only</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mb-3">All comments including notes-to-author, excluding personal notes</p>
                                    <SentimentBar sentiment={talk.sentiment} />
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
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Audience Metrics by Seniority</h2>
              <p className="text-xs text-gray-500 mb-5">Based on ORCID publication history. Senior = 10+ years of indexed publications.</p>
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
                      ['Viewers', (g: typeof AUDIENCE_METRICS.all) => g.viewers.toLocaleString()],
                      ['Engagement', (g: typeof AUDIENCE_METRICS.all) => g.engagement.toLocaleString()],
                      ['Saves', (g: typeof AUDIENCE_METRICS.all) => String(g.saves)],
                      ['Comments', (g: typeof AUDIENCE_METRICS.all) => String(g.comments)],
                      ['Median view time', (g: typeof AUDIENCE_METRICS.all) => `${g.medianViewMin} m`],
                      ['Eng / viewer', (g: typeof AUDIENCE_METRICS.all) => (g.engagement / g.viewers).toFixed(1)],
                      ['Save rate', (g: typeof AUDIENCE_METRICS.all) => `${Math.round(g.saves / g.viewers * 100)}%`],
                    ] as [string, (g: typeof AUDIENCE_METRICS.all) => string][]).map(([label, fn]) => (
                      <tr key={label}>
                        <td className="py-2.5 pr-4 text-gray-700">{label}</td>
                        {Object.values(AUDIENCE_METRICS).map(g => (
                          <td key={g.label} className="py-2.5 px-4 text-right font-medium text-gray-900">{fn(g)}</td>
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
                  Senior attendees spend {AUDIENCE_METRICS.senior.medianViewMin} minutes per talk versus {AUDIENCE_METRICS.junior.medianViewMin} for
                  junior attendees, and save at a {Math.round(AUDIENCE_METRICS.senior.saves / AUDIENCE_METRICS.senior.viewers * 100)}% rate
                  versus {Math.round(AUDIENCE_METRICS.junior.saves / AUDIENCE_METRICS.junior.viewers * 100)}% — deeper engagement per person.
                </p>
                <p>
                  When save rates diverge significantly on specific talks, it signals content
                  that resonates differently by career stage — useful for planning tracks and workshops.
                </p>
                <p>
                  Engagement per viewer ({(AUDIENCE_METRICS.senior.engagement / AUDIENCE_METRICS.senior.viewers).toFixed(1)} senior
                  vs {(AUDIENCE_METRICS.junior.engagement / AUDIENCE_METRICS.junior.viewers).toFixed(1)} junior) captures
                  the intensity of interaction independent of headcount.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-sm p-6 text-white">
              <h2 className="text-sm font-semibold mb-3">Coming Next</h2>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• <strong className="text-white">Per-talk seniority breakdown</strong> — which talks drew disproportionate senior vs junior saves and comments.</p>
                <p>• <strong className="text-white">Field segmentation</strong> — engagement by subspecialty derived from ORCID publication profiles.</p>
                <p>• <strong className="text-white">Geographic analysis</strong> — regional engagement patterns correlated with seniority and field.</p>
              </div>
            </div>
          </div>
        )}

      <Footer />
      </div>
    </div>
  );
}
