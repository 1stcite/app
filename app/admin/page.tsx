'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
];

type Poster = {
  _id: string;
  id: string;
  title: string;
  author: string;
  uploadedAt: string;
  source?: string;
  sortOrder?: number;
  sessionId?: string;
};

type Conference = {
  subdomain: string;
  name: string;
  sourceId: string;
};

type Session = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  sortOrder: number;
  conferenceId: string;
};

export default function AdminPage() {
  const [tab, setTab] = useState<'posters' | 'sessions'>('posters');
  const [posters, setPosters] = useState<Poster[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [requireLogin, setRequireLogin] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [savingSource, setSavingSource] = useState<string | null>(null);
  const [bulkSource, setBulkSource] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterSource, setFilterSource] = useState('');
  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderedPosters, setOrderedPosters] = useState<Poster[]>([]);
  const [currentConferenceId, setCurrentConferenceId] = useState('');
  // Session form state
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState({ name: '', date: '', startTime: '', endTime: '', location: '' });
  const [savingSession, setSavingSession] = useState(false);
  const dragItem = useRef<number | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const filtered = filterSource
      ? posters.filter((p) => p.source === filterSource)
      : posters;
    const sorted = [...filtered].sort((a, b) => {
      const ao = a.sortOrder ?? 999999;
      const bo = b.sortOrder ?? 999999;
      if (ao !== bo) return ao - bo;
      return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    });
    setOrderedPosters(sorted);
  }, [posters, filterSource]);

  async function fetchAll() {
    const [postersRes, confsRes, configRes] = await Promise.all([
      fetch('/api/admin/posters'),
      fetch('/api/conference?all=1'),
      fetch('/api/config'),
    ]);
    if (postersRes.ok) setPosters(await postersRes.json());
    if (confsRes.ok) {
      const allConfs: (Conference & { isRepo?: boolean })[] = await confsRes.json();
      const confs = allConfs.filter(c => !c.isRepo);
      setConferences(confs);
      const ids = confs.map(c => c.sourceId).filter(Boolean);
      setSources(ids);
      if (ids.length > 0) {
        setBulkSource(ids[0]);
        setFilterSource(ids[0]);
        setCurrentConferenceId(ids[0]);
      }
    }
    if (configRes.ok) {
      const j = await configRes.json();
      setRequireLogin(Boolean(j?.requireLogin));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!currentConferenceId) return;
    fetch(`/api/sessions?conferenceId=${currentConferenceId}`)
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {});
  }, [currentConferenceId]);

  async function setRequireLoginOnServer(nextVal: boolean) {
    setSavingCfg(true);
    try {
      const r = await fetch('/api/config', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requireLogin: nextVal }),
      });
      if (r.ok) setRequireLogin(nextVal);
    } finally { setSavingCfg(false); }
  }

  async function updateSource(id: string, source: string) {
    setSavingSource(id);
    try {
      await fetch('/api/admin/posters', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, source }),
      });
      setPosters(prev => prev.map(p => p.id === id ? { ...p, source } : p));
    } finally { setSavingSource(null); }
  }

  async function updateSessionId(id: string, sessionId: string) {
    setSavingSource(id);
    try {
      await fetch('/api/admin/posters', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, sessionId: sessionId || null }),
      });
      setPosters(prev => prev.map(p => p.id === id ? { ...p, sessionId: sessionId || undefined } : p));
    } finally { setSavingSource(null); }
  }

  async function saveOrder() {
    setSavingOrder(true);
    try {
      const reorder = orderedPosters.map((p, i) => ({ id: p.id, sortOrder: i + 1 }));
      await fetch('/api/admin/posters', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reorder }),
      });
      setPosters(prev => prev.map(p => {
        const e = reorder.find(r => r.id === p.id);
        return e ? { ...p, sortOrder: e.sortOrder } : p;
      }));
      setReorderMode(false);
    } catch { alert('Failed to save order'); }
    finally { setSavingOrder(false); }
  }

  function handleDragStart(index: number) { dragItem.current = index; }
  function handleDragEnter(index: number) {
    if (dragItem.current === null || dragItem.current === index) return;
    setOrderedPosters(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragItem.current!, 1);
      next.splice(index, 0, moved);
      dragItem.current = index;
      return next;
    });
  }

  async function bulkTag() {
    if (selected.size === 0) return;
    await Promise.all([...selected].map(id => updateSource(id, bulkSource)));
    setSelected(new Set());
  }

  async function deletePoster(id: string) {
    if (!confirm('Delete this presentation?')) return;
    const res = await fetch(`/api/posters/${id}`, { method: 'DELETE' });
    if (res.ok) setPosters(prev => prev.filter(p => p.id !== id));
    else alert('Delete failed');
  }

  // --- Session management ---
  function openNewSession() {
    setEditingSession(null);
    setSessionForm({ name: '', date: '', startTime: '', endTime: '', location: '' });
  }

  function openEditSession(s: Session) {
    setEditingSession(s);
    setSessionForm({ name: s.name, date: s.date, startTime: s.startTime, endTime: s.endTime, location: s.location });
  }

  async function saveSession() {
    if (!sessionForm.name.trim()) { alert('Session name required'); return; }
    setSavingSession(true);
    try {
      if (editingSession) {
        await fetch(`/api/sessions/${editingSession.id}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify(sessionForm),
        });
        setSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...sessionForm } : s));
      } else {
        const res = await fetch('/api/sessions', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conferenceId: currentConferenceId, ...sessionForm }),
        });
        const created = await res.json();
        setSessions(prev => [...prev, created]);
      }
      setEditingSession(undefined as any);
      setSessionForm({ name: '', date: '', startTime: '', endTime: '', location: '' });
    } finally { setSavingSession(false); }
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this session? Talks will become unassigned.')) return;
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== id));
    setPosters(prev => prev.map(p => p.sessionId === id ? { ...p, sessionId: undefined } : p));
  }

  const showSessionForm = sessionForm.name !== undefined && (editingSession !== undefined || editingSession === null) && (editingSession !== undefined);
  const sourceColor = (source?: string) => {
    if (!source) return 'bg-gray-100 text-gray-500';
    const idx = sources.indexOf(source);
    return idx >= 0 ? COLOR_PALETTE[idx % COLOR_PALETTE.length] : 'bg-gray-100 text-gray-500';
  };
  const conferenceName = (sourceId: string) => conferences.find(c => c.sourceId === sourceId)?.name ?? sourceId;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-baseline gap-4">
              <h1 className="text-3xl font-bold text-gray-700">Admin</h1>
              <Link href="/" className="text-sm text-blue-600 hover:underline">Open library →</Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Require login</span>
              <button type="button" disabled={savingCfg} onClick={() => setRequireLoginOnServer(!requireLogin)}
                className={['px-3 py-1 rounded text-sm border', requireLogin ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300', savingCfg ? 'opacity-60' : ''].join(' ')}>
                {requireLogin ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          <Link href="/"><img src="/1stcite-logo.png" alt="1stCite" className="h-10 w-auto" /></Link>
        </div>

        <button type="button" onClick={async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/'; }}
          className="text-sm text-gray-600 hover:underline mb-4 block">Logout</button>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 p-1 rounded-lg w-fit">
          {(['posters', 'sessions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={['px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'].join(' ')}>
              {t}
            </button>
          ))}
        </div>

        {/* ========== SESSIONS TAB ========== */}
        {tab === 'sessions' && (
          <div className="space-y-4">
            {/* Conference selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <select value={currentConferenceId} onChange={e => setCurrentConferenceId(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-800">
                {sources.map(s => <option key={s} value={s}>{conferenceName(s)}</option>)}
              </select>
              <button onClick={openNewSession}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                + New Session
              </button>
            </div>

            {/* Session form */}
            {(editingSession !== undefined) && (
              <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-gray-800">{editingSession ? 'Edit Session' : 'New Session'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Session Name *</label>
                    <input value={sessionForm.name} onChange={e => setSessionForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Session A: Neurodegeneration"
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Location / Room</label>
                    <input value={sessionForm.location} onChange={e => setSessionForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Room A / Ballroom"
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                    <input type="time" value={sessionForm.startTime} onChange={e => setSessionForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                    <input type="time" value={sessionForm.endTime} onChange={e => setSessionForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveSession} disabled={savingSession}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
                    {savingSession ? 'Saving…' : 'Save Session'}
                  </button>
                  <button onClick={() => setEditingSession(undefined as any)}
                    className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Sessions list */}
            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No sessions yet. Create one to start organizing talks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(s => {
                  const talkCount = posters.filter(p => p.sessionId === s.id).length;
                  return (
                    <div key={s.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{s.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                            {s.date && <span>📅 {s.date}</span>}
                            {(s.startTime || s.endTime) && <span>🕐 {s.startTime}{s.endTime ? ` – ${s.endTime}` : ''}</span>}
                            {s.location && <span>📍 {s.location}</span>}
                            <span className="text-blue-600">{talkCount} talk{talkCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => openEditSession(s)} className="text-sm text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => deleteSession(s.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== POSTERS TAB ========== */}
        {tab === 'posters' && (
          <>
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Conference:</span>
                <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setCurrentConferenceId(e.target.value); setReorderMode(false); setSelected(new Set()); }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-800">
                  <option value="">All ({posters.length})</option>
                  {sources.map(s => (
                    <option key={s} value={s}>{conferenceName(s)} ({posters.filter(p => p.source === s).length})</option>
                  ))}
                </select>
              </div>

              <div className="h-5 w-px bg-gray-300" />

              {filterSource && (
                <>
                  {reorderMode ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 italic">Drag to reorder</span>
                      <button onClick={saveOrder} disabled={savingOrder}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">
                        {savingOrder ? 'Saving…' : 'Save Order'}
                      </button>
                      <button onClick={() => setReorderMode(false)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setReorderMode(true); setSelected(new Set()); }}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                      ↕ Reorder
                    </button>
                  )}
                  <div className="h-5 w-px bg-gray-300" />
                </>
              )}

              {!reorderMode && orderedPosters.length > 0 && (
                <>
                  <button onClick={() => setSelected(new Set(orderedPosters.map(p => p.id)))} className="text-sm text-blue-600 hover:underline">
                    Select all ({orderedPosters.length})
                  </button>
                  {selected.size > 0 && (
                    <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:underline">
                      Clear ({selected.size})
                    </button>
                  )}
                  <select value={bulkSource} onChange={e => setBulkSource(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-800">
                    {sources.map(s => <option key={s} value={s}>{conferenceName(s)}</option>)}
                  </select>
                  <button onClick={bulkTag} disabled={selected.size === 0}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40">
                    Tag {selected.size || '…'} selected
                  </button>
                </>
              )}
            </div>

            {/* Poster grid */}
            {loading ? (
              <div className="text-center py-12"><p className="text-gray-600">Loading…</p></div>
            ) : orderedPosters.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600 mb-4">No presentations yet</p>
                <Link href="/upload" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Upload the First One
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orderedPosters.map((poster, index) => (
                  <div key={poster._id}
                    draggable={reorderMode}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={() => { dragItem.current = null; }}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => !reorderMode && setSelected(prev => { const n = new Set(prev); n.has(poster.id) ? n.delete(poster.id) : n.add(poster.id); return n; })}
                    className={['bg-white rounded-lg shadow-md p-5 border-2 flex flex-col transition-all',
                      reorderMode ? 'cursor-grab active:cursor-grabbing active:opacity-60' : 'cursor-pointer',
                      !reorderMode && selected.has(poster.id) ? 'border-blue-500' : 'border-transparent hover:shadow-lg'].join(' ')}>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {reorderMode && <span className="text-lg text-gray-400">⠿</span>}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sourceColor(poster.source)}`}>
                          {poster.source || 'untagged'}
                        </span>
                        {poster.sortOrder != null && (
                          <span className="text-xs text-gray-400 font-mono">#{poster.sortOrder}</span>
                        )}
                      </div>
                      {!reorderMode && (
                        <input type="checkbox" checked={selected.has(poster.id)}
                          onChange={() => {}} onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-blue-600" />
                      )}
                    </div>

                    <h2 className="text-base font-bold mb-1 text-gray-900 line-clamp-2">{poster.title}</h2>
                    <p className="text-sm text-gray-600 mb-3">by {poster.author}</p>

                    {!reorderMode && (
                      <div className="mt-auto space-y-2">
                        {/* Conference assignment */}
                        <select value={poster.source || ''} onChange={e => { e.stopPropagation(); updateSource(poster.id, e.target.value); }}
                          onClick={e => e.stopPropagation()} disabled={savingSource === poster.id}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-800">
                          <option value="">— untagged —</option>
                          {sources.map(s => <option key={s} value={s}>{conferenceName(s)}</option>)}
                        </select>

                        {/* Session assignment */}
                        {sessions.length > 0 && (
                          <select
                            value={poster.sessionId || ''}
                            onChange={e => { e.stopPropagation(); updateSessionId(poster.id, e.target.value); }}
                            onClick={e => e.stopPropagation()}
                            disabled={savingSource === poster.id}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-800"
                          >
                            <option value="">— no session —</option>
                            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex gap-3">
                            <Link href={`/view/${poster.id}`} onClick={e => e.stopPropagation()} className="text-blue-600 text-sm hover:underline">View →</Link>
                            <Link href={`/edit/${poster.id}`} onClick={e => e.stopPropagation()} className="text-gray-500 text-sm hover:underline">Edit</Link>
                          </div>
                          <button onClick={e => { e.stopPropagation(); deletePoster(poster.id); }} className="text-sm text-red-600 hover:underline">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {orderedPosters.length > 0 && (
              <div className="hidden md:block mt-8 pt-6 border-t">
                <Link href="/upload" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Upload Presentations
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
