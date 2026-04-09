'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Realistic mock data based on actual IAPRD 2025 content ──────────────────

const CONFERENCE = {
  name: "IAPRD 2025",
  date: "Friday, May 9",
  timeSlot: "14:30 – 16:00",
  totalAttendees: 847,
  totalViews: 3241,
  totalStars: 186,
  totalComments: 43,
  uniqueCountries: 31,
};

const SESSIONS = [
  {
    id: "s7",
    name: "Session 7: Management of Advanced Parkinson's",
    chair: "Zoltan Mari & Jinyoung Youn",
    location: "Northside Ballroom",
    color: "#2563eb",
    views: 1284,
    stars: 74,
    comments: 18,
    talks: [
      { id: "7a", title: "Defining Advanced PD and Treatment Needs", author: "Indu Subramanian", views: 487, stars: 31, comments: 7, sentiment: 0.82, slideHeat: [12, 45, 23, 87, 34, 92, 56, 78, 43, 65] },
      { id: "7b", title: "Cognitive and Psychiatric Issues", author: "Daniel Weintraub", views: 412, stars: 28, comments: 6, sentiment: 0.74, slideHeat: [23, 67, 89, 45, 12, 34, 78, 56, 90, 43] },
      { id: "7c", title: "Motor Fluctuations", author: "Rajesh Pahwa", views: 385, stars: 15, comments: 5, sentiment: 0.71, slideHeat: [34, 56, 23, 78, 45, 67, 12, 89, 34, 56] },
    ],
  },
  {
    id: "s8",
    name: "Session 8: Hyperkinetic Movement Disorders",
    chair: "Karen Frei & Anhar Hassan",
    location: "Grand Ballroom – Salon D",
    color: "#7c3aed",
    views: 1109,
    stars: 67,
    comments: 14,
    talks: [
      { id: "8a", title: "Tardive Syndromes", author: "Roongroj Bhidayasri", views: 356, stars: 22, comments: 4, sentiment: 0.68, slideHeat: [45, 78, 34, 56, 89, 23, 67, 45, 12, 78] },
      { id: "8b", title: "Potential Disease-Modifying Therapies for Huntington's Disease", author: "Sarah J Tabrizi", views: 489, stars: 38, comments: 7, sentiment: 0.91, slideHeat: [56, 34, 78, 92, 45, 87, 23, 67, 89, 45] },
      { id: "8c", title: "Myoclonus and Tics", author: "Christos Ganos", views: 264, stars: 7, comments: 3, sentiment: 0.65, slideHeat: [23, 45, 67, 34, 56, 78, 12, 45, 34, 23] },
    ],
  },
  {
    id: "s4",
    name: "Workshop 4: Diagnostic Testing for Parkinsonism",
    chair: "Marie Saint-Hilaire & Roy Alcalay",
    location: "Grand Ballroom – Salons A-D",
    color: "#059669",
    views: 848,
    stars: 45,
    comments: 11,
    talks: [
      { id: "4a", title: "Utility and Interpretation of Skin Biopsy Testing for Alpha Synuclein", author: "Pravin Khemani", views: 312, stars: 19, comments: 4, sentiment: 0.78, slideHeat: [67, 89, 45, 23, 78, 56, 34, 90, 45, 67] },
      { id: "4b", title: "Differential Diagnosis with CSF Diagnosis Markers", author: "David Coughlin", views: 287, stars: 16, comments: 4, sentiment: 0.72, slideHeat: [34, 56, 78, 45, 23, 67, 89, 34, 56, 78] },
      { id: "4c", title: "Current and Emerging Imaging Markers and Techniques", author: "Marina Picillo", views: 249, stars: 10, comments: 3, sentiment: 0.69, slideHeat: [45, 67, 23, 56, 78, 34, 12, 45, 67, 34] },
    ],
  },
];

const ALL_TALKS = SESSIONS.flatMap(s => s.talks.map(t => ({ ...t, session: s.name, sessionColor: s.color })));
const TOP_TALKS = [...ALL_TALKS].sort((a, b) => b.stars - a.stars);

const COUNTRIES = [
  { name: "United States", pct: 34 }, { name: "Japan", pct: 12 }, { name: "Germany", pct: 9 },
  { name: "United Kingdom", pct: 8 }, { name: "France", pct: 6 }, { name: "Canada", pct: 5 },
  { name: "Australia", pct: 4 }, { name: "Italy", pct: 4 }, { name: "South Korea", pct: 3 },
  { name: "Other (22)", pct: 15 },
];

const ENGAGEMENT_TIMELINE = [
  { time: "14:30", views: 12 }, { time: "14:40", views: 48 }, { time: "14:50", views: 124 },
  { time: "15:00", views: 187 }, { time: "15:10", views: 243 }, { time: "15:20", views: 298 },
  { time: "15:30", views: 334 }, { time: "15:40", views: 289 }, { time: "15:50", views: 412 },
  { time: "16:00", views: 356 }, { time: "16:10", views: 287 }, { time: "16:20", views: 198 },
  { time: "16:30", views: 143 }, { time: "16:40", views: 98 }, { time: "16:50", views: 67 },
  { time: "17:00", views: 45 },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "#2563eb" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SentimentBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? '#059669' : score >= 0.7 ? '#d97706' : '#dc2626';
  const label = score >= 0.8 ? 'Positive' : score >= 0.7 ? 'Mixed' : 'Critical';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: color + '18', color }}>
      {label} {pct}%
    </span>
  );
}

function SlideHeatBar({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all"
          style={{ height: `${(v / max) * 100}%`, background: v === max ? '#2563eb' : `rgba(37,99,235,${0.15 + (v / max) * 0.5})` }}
          title={`Slide ${i + 1}: ${v} views`}
        />
      ))}
    </div>
  );
}

function EngagementChart({ data }: { data: typeof ENGAGEMENT_TIMELINE }) {
  const max = Math.max(...data.map(d => d.views));
  const w = 100 / (data.length - 1);
  const points = data.map((d, i) => `${i * w},${100 - (d.views / max) * 90}`).join(' ');
  const area = `0,100 ${points} 100,100`;

  return (
    <div className="relative h-32">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#grad)" />
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 mt-1">
        {data.filter((_, i) => i % 4 === 0).map(d => <span key={d.time}>{d.time}</span>)}
      </div>
    </div>
  );
}

function SessionBar({ session, max }: { session: typeof SESSIONS[0]; max: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 truncate max-w-[60%]">{session.name.replace(/^Session \d+: |^Workshop \d+: /, '')}</span>
        <span className="text-gray-500 text-xs">{session.views.toLocaleString()} views</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(session.views / max) * 100}%`, background: session.color }} />
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'talks' | 'audience'>('overview');
  const [expandedSession, setExpandedSession] = useState<string | null>('s8');
  const maxViews = Math.max(...SESSIONS.map(s => s.views));

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-blue-600 text-sm hover:underline">← Presentations</Link>
            <span className="text-gray-300">|</span>
            <div>
              <span className="font-semibold text-gray-900 text-sm">{CONFERENCE.name}</span>
              <span className="text-gray-400 text-sm ml-2">{CONFERENCE.date} · {CONFERENCE.timeSlot}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <span>⚡</span> Sample data
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Hero stats */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Conference Insights</h1>
          <p className="text-gray-500 text-sm mb-6">Engagement analytics for {CONFERENCE.name} · {CONFERENCE.date}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Slide Views" value={CONFERENCE.totalViews} sub="across all sessions" color="#2563eb" />
            <StatCard label="Stars" value={CONFERENCE.totalStars} sub="talks bookmarked" color="#7c3aed" />
            <StatCard label="Comments" value={CONFERENCE.totalComments} sub="from attendees" color="#059669" />
            <StatCard label="Countries" value={CONFERENCE.uniqueCountries} sub="reached globally" color="#d97706" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['overview', 'talks', 'audience'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={['px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
                activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'].join(' ')}>
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Engagement over time */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Slide Views Over Time</h2>
              <p className="text-xs text-gray-400 mb-4">Attendee engagement during and after the session</p>
              <EngagementChart data={ENGAGEMENT_TIMELINE} />
              <p className="text-xs text-gray-400 mt-3 text-center">Peak at 15:50 — Q&A period drives return views</p>
            </div>

            {/* Session comparison */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Session Engagement</h2>
              <div className="space-y-4">
                {SESSIONS.map(s => <SessionBar key={s.id} session={s} max={maxViews} />)}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                {SESSIONS.map(s => (
                  <div key={s.id}>
                    <p className="text-xs text-gray-400 mb-1 truncate">{s.location}</p>
                    <p className="text-sm font-semibold" style={{ color: s.color }}>⭐ {s.stars}</p>
                    <p className="text-xs text-gray-400">{s.comments} comments</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top talk */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏆</span>
                <h2 className="font-semibold text-gray-900">Highest Engagement Talk</h2>
              </div>
              {(() => {
                const top = TOP_TALKS[0];
                return (
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-gray-900">{top.title}</p>
                      <p className="text-sm text-gray-500">by {top.author}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{top.session}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-600">👁 {top.views} views</span>
                      <span className="text-gray-600">⭐ {top.stars} stars</span>
                      <span className="text-gray-600">💬 {top.comments} comments</span>
                      <SentimentBadge score={top.sentiment} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Slide attention heatmap</p>
                      <SlideHeatBar data={top.slideHeat} />
                      <p className="text-xs text-gray-400 mt-1">Slide 6 most revisited — trial design methodology</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── TALKS TAB ── */}
        {activeTab === 'talks' && (
          <div className="space-y-4">
            {SESSIONS.map(session => (
              <div key={session.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Session header */}
                <button
                  onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: session.color }} />
                      <p className="font-semibold text-gray-900 text-sm">{session.name}</p>
                    </div>
                    <p className="text-xs text-gray-400">📍 {session.location} · 👤 {session.chair}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <span className="text-gray-500">👁 {session.views}</span>
                    <span className="text-gray-500">⭐ {session.stars}</span>
                    <span className="text-gray-400 text-xs">{expandedSession === session.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Talks */}
                {expandedSession === session.id && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {session.talks.map((talk, i) => (
                      <div key={talk.id} className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-400">{talk.id.toUpperCase()}</span>
                              <p className="font-medium text-gray-900 text-sm">{talk.title}</p>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">by {talk.author}</p>

                            {/* Slide heatmap */}
                            <div className="mb-2">
                              <p className="text-xs text-gray-400 mb-1">Slide attention</p>
                              <SlideHeatBar data={talk.slideHeat} />
                            </div>
                          </div>
                          <div className="shrink-0 text-right space-y-1">
                            <p className="text-lg font-bold text-gray-900">{talk.views}</p>
                            <p className="text-xs text-gray-400">views</p>
                            <div className="flex gap-2 justify-end text-xs text-gray-500 mt-2">
                              <span>⭐ {talk.stars}</span>
                              <span>💬 {talk.comments}</span>
                            </div>
                            <div className="mt-2">
                              <SentimentBadge score={talk.sentiment} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── AUDIENCE TAB ── */}
        {activeTab === 'audience' && (
          <div className="space-y-6">

            <div className="grid md:grid-cols-2 gap-6">
              {/* Geographic reach */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Geographic Reach</h2>
                <div className="space-y-2">
                  {COUNTRIES.map(c => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28 shrink-0">{c.name}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment sentiment breakdown */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Comment Sentiment</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Positive / Enthusiastic', pct: 58, color: '#059669', examples: ['Excellent trial design', 'Very relevant to my patients'] },
                    { label: 'Questions / Curious', pct: 31, color: '#d97706', examples: ['What about earlier stages?', 'How does this compare to...'] },
                    { label: 'Critical / Skeptical', pct: 11, color: '#dc2626', examples: ['Sample size concerns', 'Selection bias?'] },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium" style={{ color: s.color }}>{s.label}</span>
                        <span className="text-gray-500">{s.pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                      <p className="text-xs text-gray-400 italic">e.g. "{s.examples[0]}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* What this means */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
              <h2 className="font-semibold text-blue-900 mb-3">What This Means for IAPRD</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {[
                  { icon: '🌍', title: 'Global Amplification', body: 'Your session reached 31 countries — far beyond the room. Attendees who couldn\'t make it to all parallel sessions engaged asynchronously.' },
                  { icon: '📊', title: 'Program Intelligence', body: 'Huntington\'s disease content drove the highest engagement. Data like this informs next year\'s program committee decisions.' },
                  { icon: '🔬', title: 'Presenter Value', body: 'Each presenter receives a DOI-citable record of their talk with engagement metrics — a new line on their CV that didn\'t exist before.' },
                ].map(item => (
                  <div key={item.title}>
                    <p className="text-lg mb-1">{item.icon}</p>
                    <p className="font-semibold text-blue-900 mb-1">{item.title}</p>
                    <p className="text-blue-700 text-xs leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Future metrics teaser */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-semibold text-gray-900">Coming with PresentrXiv Integration</h2>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Roadmap</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { icon: '🔗', label: 'Citation tracking', desc: 'How many papers cite this presentation after publication' },
                  { icon: '📈', label: 'Post-conference reach', desc: 'Views and downloads after the DOI is minted' },
                  { icon: '🏥', label: 'Institutional reach', desc: 'Which hospitals and universities engaged' },
                  { icon: '💊', label: 'Industry engagement', desc: 'Anonymized pharma/biotech viewing patterns' },
                ].map(item => (
                  <div key={item.label} className="flex gap-3 p-3 rounded-lg bg-gray-50">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
