'use client';

import { useState } from 'react';
import Footer from '@/app/components/Footer';
import Link from 'next/link';

// ── Mock data: IAPRD 2025 with new engagement model ─────────────────────────

const CONFERENCE = {
  name: "IAPRD 2025",
  date: "Friday, May 9",
  timeSlot: "11:00 – 12:30 & 14:30 – 16:00",
  totalViewers: 847,
  totalEngagement: 14820,
  totalThumbsUp: 623,
  totalComments: 97,
  totalCommenters: 54,
  uniqueCountries: 31,
};

type Talk = {
  id: string;
  title: string;
  author: string;
  engagement: number;
  thumbsUp: number;
  viewers: number;
  medianViewMin: number;
  comments: number;
  commenters: number;
  saves: number;
  slideData: SlideData[];
};

type SlideData = {
  slide: number;
  dwell: number;
  controversy: 'none' | 'low' | 'mid' | 'high';
  confusion: 'none' | 'low' | 'mid' | 'high';
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
  const contLevels: Array<SlideData['controversy']> = ['none', 'low', 'mid', 'high'];
  const confLevels: Array<SlideData['confusion']> = ['none', 'low', 'mid', 'high'];
  return Array.from({ length: count }, (_, i) => {
    const h = ((seed * 31 + i * 17) % 100);
    return {
      slide: i + 1,
      dwell: 30 + h,
      controversy: contLevels[((seed + i * 7) % 13) < 5 ? 0 : ((seed + i * 7) % 13) < 9 ? 1 : ((seed + i * 7) % 13) < 11 ? 2 : 3],
      confusion: confLevels[((seed + i * 11) % 11) < 5 ? 0 : ((seed + i * 11) % 11) < 8 ? 1 : ((seed + i * 11) % 11) < 10 ? 2 : 3],
    };
  });
}

const SESSIONS: Session[] = [
  {
    id: "s5",
    name: "Parallel Session 5: Update on Neuromodulation",
    chair: "Zoltan Mari & Jinyoung Youn",
    location: "Northside Ballroom",
    color: "#2563eb",
    time: "11:00 – 12:30",
    talks: [
      { id: "5a", title: "MR-guided Focused Ultrasound", author: "Gordon Baltuch", engagement: 427, thumbsUp: 46, viewers: 312, medianViewMin: 6.8, comments: 7, commenters: 5, saves: 28, slideData: makeSlides(10, 1) },
      { id: "5b", title: "Deep Brain Stimulation", author: "Alexandra Boogers", engagement: 243, thumbsUp: 61, viewers: 198, medianViewMin: 5.2, comments: 4, commenters: 3, saves: 12, slideData: makeSlides(12, 2) },
      { id: "5c", title: "Neuromodulatory Neurostimulation: TMS, tDCS, and Beyond", author: "Robert Chen", engagement: 239, thumbsUp: 32, viewers: 187, medianViewMin: 4.9, comments: 5, commenters: 4, saves: 14, slideData: makeSlides(8, 3) },
    ],
  },
  {
    id: "s6",
    name: "Parallel Session 6: Defining and Treating Atypical Parkinsonism",
    chair: "Karen Frei & Anhar Hassan",
    location: "Grand Ballroom – Salon D",
    color: "#7c3aed",
    time: "11:00 – 12:30",
    talks: [
      { id: "6a", title: "Differentiating PSP, MSA, and Corticobasal Syndrome", author: "Ai-Huey Tan", engagement: 496, thumbsUp: 12, viewers: 298, medianViewMin: 7.3, comments: 16, commenters: 12, saves: 42, slideData: makeSlides(14, 4) },
      { id: "6b", title: "Therapeutic Approaches to Atypical Parkinsonism", author: "Huw Morris", engagement: 227, thumbsUp: 91, viewers: 174, medianViewMin: 5.1, comments: 3, commenters: 2, saves: 15, slideData: makeSlides(10, 5) },
      { id: "6c", title: "Debate: Is Neuropathology the Gold Standard for Diagnosis?", author: "Paola Sandroni & Glenda Halliday", engagement: 429, thumbsUp: 94, viewers: 264, medianViewMin: 8.1, comments: 14, commenters: 11, saves: 35, slideData: makeSlides(8, 6) },
    ],
  },
  {
    id: "w3",
    name: "Workshop 3: Botulinum Toxin Injection Workshop",
    chair: "Marie Saint-Hilaire & Roy Alcalay",
    location: "Grand Ballroom – Salons A-C",
    color: "#059669",
    time: "11:00 – 12:30",
    talks: [
      { id: "w3a", title: "Clinical Utility of Botulinum Neurotoxins", author: "Alberto Albanese", engagement: 302, thumbsUp: 21, viewers: 215, medianViewMin: 4.4, comments: 5, commenters: 4, saves: 22, slideData: makeSlides(10, 7) },
      { id: "w3b", title: "Techniques for Muscle Localization", author: "Katharine Alter", engagement: 362, thumbsUp: 57, viewers: 249, medianViewMin: 5.9, comments: 8, commenters: 6, saves: 28, slideData: makeSlides(12, 8) },
      { id: "w3c", title: "Injection Demonstration Video Cases", author: "Jaroslaw Slawek & David Simpson", engagement: 642, thumbsUp: 133, viewers: 412, medianViewMin: 9.2, comments: 18, commenters: 14, saves: 52, slideData: makeSlides(6, 9) },
    ],
  },
];

const ALL_TALKS = SESSIONS.flatMap(s => s.talks.map(t => ({ ...t, session: s.name, sessionColor: s.color })));

const COUNTRIES = [
  { name: "United States", pct: 34 }, { name: "Japan", pct: 12 }, { name: "Germany", pct: 9 },
  { name: "United Kingdom", pct: 8 }, { name: "France", pct: 6 }, { name: "Canada", pct: 5 },
  { name: "Australia", pct: 4 }, { name: "Italy", pct: 4 }, { name: "South Korea", pct: 3 },
  { name: "Other (22)", pct: 15 },
];

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

function ThumbIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} style={{ width: "14px", height: "14px" }} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zm4-.167v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.556 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
    </svg>
  );
}

function SessionBar({ session, maxEng }: { session: Session; maxEng: number }) {
  const totalEng = session.talks.reduce((s, t) => s + t.engagement, 0);
  const totalThumbs = session.talks.reduce((s, t) => s + t.thumbsUp, 0);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 truncate max-w-[55%]">{session.name.replace(/^Parallel Session \d+: |^Workshop \d+: /, '')}</span>
        <span className="text-gray-500 text-xs flex items-center gap-3">
          <span>{totalEng.toLocaleString()} eng</span>
          <span className="flex items-center gap-1 text-blue-500"><ThumbIcon /> {totalThumbs}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(totalEng / maxEng) * 100}%`, background: session.color }} />
      </div>
    </div>
  );
}

const controversyColors: Record<string, string> = { none: '#e5e7eb', low: '#d5e8d4', mid: '#f9d1cc', high: '#f1948a' };
const confusionColors: Record<string, string> = { none: '#e5e7eb', low: '#dbeafe', mid: '#93c5fd', high: '#3b82f6' };

function SlideHeatmap({ slides, colorKey, colorMap }: { slides: SlideData[]; colorKey: 'controversy' | 'confusion'; colorMap: Record<string, string> }) {
  const maxDwell = Math.max(...slides.map(s => s.dwell));
  return (
    <div className="space-y-0.5">
      {slides.map(s => {
        const pct = Math.round((s.dwell / maxDwell) * 100);
        const color = colorMap[s[colorKey]];
        return (
          <div key={s.slide} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{s.slide}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded-sm overflow-hidden">
              <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeatmapLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex gap-3 mt-2">
      {items.map(i => (
        <span key={i.label} className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'talks' | 'audience'>('overview');
  const [expandedSession, setExpandedSession] = useState<string | null>('s6');
  const [expandedTalk, setExpandedTalk] = useState<string | null>(null);

  const maxSessionEng = Math.max(...SESSIONS.map(s => s.talks.reduce((sum, t) => sum + t.engagement, 0)));
  const sortedTalks = [...ALL_TALKS].sort((a, b) => b.engagement - a.engagement);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-blue-600 text-sm hover:underline">← Presentations</Link>
            <span className="text-gray-300">|</span>
            <div>
              <span className="font-semibold text-gray-900 text-sm">{CONFERENCE.name}</span>
              <span className="text-gray-400 text-sm ml-2">{CONFERENCE.date}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/methodology" className="text-xs text-blue-600 hover:underline">Methodology</Link>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <span>⚡</span> Sample data
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Hero stats */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Conference Insights</h1>
          <p className="text-gray-500 text-sm mb-6">Engagement analytics for {CONFERENCE.name} · {CONFERENCE.date}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Engagement" value={CONFERENCE.totalEngagement} sub="scheduled + saves×2 + comments×3" color="#2563eb" />
            <StatCard label="Thumbs Up" value={CONFERENCE.totalThumbsUp} sub="binary approval signal" color="#7c3aed" />
            <StatCard label="Comments" value={CONFERENCE.totalComments} sub={`from ${CONFERENCE.totalCommenters} commenters`} color="#059669" />
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
                {sortedTalks.slice(0, 5).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                      <div className="text-xs text-gray-500">{t.author}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-semibold text-gray-900">{t.engagement}</div>
                      <div className="flex items-center gap-1 justify-end text-blue-500 text-xs">
                        <ThumbIcon /> {t.thumbsUp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top talks by thumbs-up */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Talks by Thumbs-Up</h2>
              <div className="space-y-3">
                {[...ALL_TALKS].sort((a, b) => b.thumbsUp - a.thumbsUp).slice(0, 5).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                      <div className="text-xs text-gray-500">{t.author}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-blue-600 text-lg font-semibold">
                        <ThumbIcon className="text-blue-600" /> {t.thumbsUp}
                      </div>
                      <div className="text-xs text-gray-400">{t.engagement} eng</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TALKS TAB ── */}
        {activeTab === 'talks' && (
          <div className="space-y-3">
            {SESSIONS.map(session => {
              const isExpanded = expandedSession === session.id;
              return (
                <div key={session.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Session header */}
                  <button
                    type="button"
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  >
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

                  {/* Talks list */}
                  {isExpanded && (
                    <div className="border-t">
                      {/* Column header */}
                      <div className="grid grid-cols-[1fr_80px_80px_70px_70px] gap-3 px-5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b bg-gray-50">
                        <div>Talk</div>
                        <div className="text-center">Engagement</div>
                        <div className="text-center">👍</div>
                        <div className="text-center">Viewers</div>
                        <div className="text-center">Comments</div>
                      </div>

                      {session.talks.map(talk => {
                        const isTalkExpanded = expandedTalk === talk.id;
                        return (
                          <div key={talk.id}>
                            <button
                              type="button"
                              className="w-full grid grid-cols-[1fr_80px_80px_70px_70px] gap-3 px-5 py-3 items-center hover:bg-blue-50/30 transition-colors text-left"
                              onClick={() => setExpandedTalk(isTalkExpanded ? null : talk.id)}
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">{talk.title}</div>
                                <div className="text-xs text-gray-500">{talk.author}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">{talk.engagement}</div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-blue-600 font-medium">
                                  <ThumbIcon className="text-blue-600" /> {talk.thumbsUp}
                                </div>
                              </div>
                              <div className="text-center text-sm text-gray-600">{talk.viewers}</div>
                              <div className="text-center text-sm text-gray-600">{talk.comments}</div>
                            </button>

                            {/* Expanded: heatmaps */}
                            {isTalkExpanded && (
                              <div className="px-5 pb-5 pt-2 border-t bg-gray-50/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Controversy heatmap (public) */}
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Slide Attention · Controversy</div>
                                    <p className="text-[10px] text-gray-400 mb-2">Color = disagreement among non-question public comments</p>
                                    <SlideHeatmap slides={talk.slideData} colorKey="controversy" colorMap={controversyColors} />
                                    <HeatmapLegend items={[
                                      { color: '#d5e8d4', label: 'Consensus' },
                                      { color: '#f9d1cc', label: 'Mild' },
                                      { color: '#f1948a', label: 'High' },
                                      { color: '#e5e7eb', label: 'Below threshold' },
                                    ]} />
                                  </div>

                                  {/* Confusion heatmap (presenter-only) */}
                                  <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-white/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-semibold text-gray-700">Slide Attention · Confusion</span>
                                      <span className="text-[9px] font-semibold bg-red-100 text-red-800 px-1.5 py-0.5 rounded uppercase">Presenter only</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mb-2">Color = question density (AI-classified from comments + notes-to-author)</p>
                                    <SlideHeatmap slides={talk.slideData} colorKey="confusion" colorMap={confusionColors} />
                                    <HeatmapLegend items={[
                                      { color: '#d5e8d4', label: 'Clear' },
                                      { color: '#dbeafe', label: 'Some Qs' },
                                      { color: '#93c5fd', label: 'Many Qs' },
                                      { color: '#3b82f6', label: 'High' },
                                      { color: '#e5e7eb', label: 'Below threshold' },
                                    ]} />
                                  </div>
                                </div>

                                {/* Stats detail row */}
                                <div className="grid grid-cols-5 gap-4 mt-4 pt-3 border-t text-center text-xs">
                                  <div><div className="font-semibold text-gray-900">{talk.viewers}</div><div className="text-gray-400">Viewers</div></div>
                                  <div><div className="font-semibold text-gray-900">{talk.medianViewMin} m</div><div className="text-gray-400">Median time</div></div>
                                  <div><div className="font-semibold text-gray-900">{talk.commenters}</div><div className="text-gray-400">Commenters</div></div>
                                  <div><div className="font-semibold text-gray-900">{talk.saves}</div><div className="text-gray-400">Saves</div></div>
                                  <div><div className="font-semibold text-blue-600 flex items-center justify-center gap-1"><ThumbIcon className="text-blue-600" /> {talk.thumbsUp}</div><div className="text-gray-400">Thumbs up</div></div>
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

        {/* ── AUDIENCE TAB ── */}
        {activeTab === 'audience' && (
          <div className="space-y-6">
            {/* Geographic reach */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Geographic Reach</h2>
              <p className="text-xs text-gray-500 mb-4">Viewers from {CONFERENCE.uniqueCountries} countries</p>
              <div className="space-y-2">
                {COUNTRIES.map(c => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-28 truncate">{c.name}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What this means */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">What This Means for IAPRD</h2>
              <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                <p>
                  With {CONFERENCE.totalEngagement.toLocaleString()} total engagement across {ALL_TALKS.length} talks and
                  {' '}{CONFERENCE.totalThumbsUp} thumbs-up from attendees, this session demonstrates sustained,
                  active interaction — not passive viewing.
                </p>
                <p>
                  The separation between engagement and thumbs-up reveals which talks generated attention versus
                  approval. High-engagement, lower-thumbs-up talks like the atypical parkinsonism differential diagnosis
                  session suggest content that provoked discussion without universal approval — a marker of genuinely
                  productive scientific discourse.
                </p>
                <p>
                  The per-slide controversy and confusion heatmaps (available per-talk in the Talks tab) give program
                  committees a new tool: identifying which specific content points drove disagreement or confusion,
                  enabling targeted follow-up sessions at IAPRD 2026.
                </p>
              </div>
            </div>

            {/* Roadmap */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-sm p-6 text-white">
              <h2 className="text-sm font-semibold mb-3">Coming Next</h2>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• <strong className="text-white">ORCID integration</strong> — audience composition breakdown by field, seniority, and geography for talks with ORCID-linked thumbs-up data.</p>
                <p>• <strong className="text-white">Real-time tracking</strong> — per-slide dwell time, revisit patterns, and attention curves replacing the current mock data.</p>
                <p>• <strong className="text-white">PresentrXiv archiving</strong> — DOI-linked presentation records with citation tracking via OpenAlex.</p>
              </div>
            </div>
          </div>
        )}

      <Footer />
      </div>
    </div>
  );
}
