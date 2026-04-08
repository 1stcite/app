'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

// SOURCES is now fetched dynamically from the conferences collection

type Poster = {
  _id: string;
  id: string;
  title: string;
  author: string;
  uploadedAt: string;
  source?: string;
  sortOrder?: number;
};

type Conference = {
  subdomain: string;
  name: string;
  sourceId: string;
};

const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
];

export default function AdminPage() {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [requireLogin, setRequireLogin] = useState<boolean>(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [savingSource, setSavingSource] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [bulkSource, setBulkSource] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterSource, setFilterSource] = useState<string>('');
  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderedPosters, setOrderedPosters] = useState<Poster[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    fetchPosters();
    fetchConfig();
    fetchSources();
  }, []);

  // Sync orderedPosters when filter or posters change
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

  async function fetchSources() {
    try {
      const r = await fetch('/api/conference?all=1', { cache: 'no-store' });
      if (r.ok) {
        const allConfs: (Conference & { isRepo?: boolean })[] = await r.json();
        const confs = allConfs.filter((c) => !c.isRepo);
        setConferences(confs);
        const sourceIds = confs.map((c) => c.sourceId).filter(Boolean);
        setSources(sourceIds);
        if (sourceIds.length > 0) setBulkSource(sourceIds[0]);
      }
    } catch (e) {
      console.error('Error fetching conferences:', e);
      const fallback = ['1stcite', 'iaprd', 'presentrxiv', '1stcite-demo'];
      setSources(fallback);
      setBulkSource(fallback[0]);
    }
  }

  async function fetchConfig() {
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        setRequireLogin(Boolean(j?.requireLogin));
      }
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  }

  async function setRequireLoginOnServer(nextVal: boolean) {
    setSavingCfg(true);
    try {
      const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requireLogin: nextVal }),
      });
      if (r.ok) setRequireLogin(nextVal);
    } catch (e) {
      console.error('Error saving config:', e);
      alert('Failed to update config');
    } finally {
      setSavingCfg(false);
    }
  }

  async function fetchPosters() {
    try {
      const response = await fetch('/api/admin/posters');
      if (response.ok) {
        const data = await response.json();
        setPosters(data);
      }
    } catch (error) {
      console.error('Error fetching posters:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSource(id: string, source: string) {
    setSavingSource(id);
    try {
      await fetch('/api/admin/posters', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, source }),
      });
      setPosters((prev) =>
        prev.map((p) => (p.id === id ? { ...p, source } : p))
      );
    } finally {
      setSavingSource(null);
    }
  }

  async function saveOrder() {
    setSavingOrder(true);
    try {
      const reorder = orderedPosters.map((p, i) => ({ id: p.id, sortOrder: i + 1 }));
      await fetch('/api/admin/posters', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reorder }),
      });
      // Update local state
      setPosters((prev) =>
        prev.map((p) => {
          const entry = reorder.find((r) => r.id === p.id);
          return entry ? { ...p, sortOrder: entry.sortOrder } : p;
        })
      );
      setReorderMode(false);
    } catch (e) {
      alert('Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  }

  // Drag handlers
  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
    if (dragItem.current === null || dragItem.current === index) return;
    setOrderedPosters((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragItem.current!, 1);
      next.splice(index, 0, moved);
      dragItem.current = index;
      return next;
    });
  }

  function handleDragEnd() {
    dragItem.current = null;
    dragOverItem.current = null;
  }

  async function bulkTag() {
    if (selected.size === 0) return;
    const ids = [...selected];
    await Promise.all(ids.map((id) => updateSource(id, bulkSource)));
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(orderedPosters.map((p) => p.id)));
  }

  async function deletePoster(id: string) {
    if (!confirm('Delete this presentation?')) return;
    try {
      const res = await fetch(`/api/posters/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? 'Delete failed');
        return;
      }
      setPosters((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Delete failed');
    }
  }

  const sourceColor = (source?: string) => {
    if (!source) return 'bg-gray-100 text-gray-500';
    const idx = sources.indexOf(source);
    return idx >= 0 ? COLOR_PALETTE[idx % COLOR_PALETTE.length] : 'bg-gray-100 text-gray-500';
  };

  const conferenceName = (sourceId: string) => {
    const conf = conferences.find((c) => c.sourceId === sourceId);
    return conf?.name ?? sourceId;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="flex items-baseline gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-700">Admin</h1>
              <Link href="/" className="text-sm text-blue-600 hover:underline">
                Open attendee library →
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Require login for attendees</span>
              <button
                type="button"
                disabled={savingCfg}
                onClick={() => setRequireLoginOnServer(!requireLogin)}
                className={[
                  'px-3 py-1.5 rounded-md text-sm border',
                  requireLogin ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300',
                  savingCfg ? 'opacity-60' : '',
                ].join(' ')}
              >
                {requireLogin ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          <Link href="/" className="shrink-0">
            <img src="/1stcite-logo.png" alt="1stCite" className="h-10 w-auto" />
          </Link>
        </div>

        <button
          type="button"
          onClick={async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
          }}
          className="text-sm text-gray-600 hover:underline mb-6 block"
        >
          Logout
        </button>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-3">

          {/* Conference filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Conference:</span>
            <select
              value={filterSource}
              onChange={(e) => { setFilterSource(e.target.value); setReorderMode(false); setSelected(new Set()); }}
              className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-800"
            >
              <option value="">All ({posters.length})</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {conferenceName(s)} ({posters.filter(p => p.source === s).length})
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-gray-300" />

          {/* Reorder mode toggle */}
          {filterSource && (
            <>
              {reorderMode ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 italic">Drag cards to reorder</span>
                  <button
                    onClick={saveOrder}
                    disabled={savingOrder}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingOrder ? 'Saving…' : 'Save Order'}
                  </button>
                  <button
                    onClick={() => { setReorderMode(false); }}
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setReorderMode(true); setSelected(new Set()); }}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  ↕ Reorder
                </button>
              )}
              <div className="h-5 w-px bg-gray-300" />
            </>
          )}

          {/* Bulk tag (hidden in reorder mode) */}
          {!reorderMode && orderedPosters.length > 0 && (
            <>
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">
                Select all ({orderedPosters.length})
              </button>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:underline">
                  Clear ({selected.size})
                </button>
              )}
              <select
                value={bulkSource}
                onChange={(e) => setBulkSource(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-800"
              >
                {sources.map((s) => (
                  <option key={s} value={s}>{conferenceName(s)}</option>
                ))}
              </select>
              <button
                onClick={bulkTag}
                disabled={selected.size === 0}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40"
              >
                Tag {selected.size || '…'} selected
              </button>
            </>
          )}
        </div>

        {/* Poster grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading presentations...</p>
          </div>
        ) : orderedPosters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-600 mb-4">No presentations yet</p>
            <Link href="/upload" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Upload the First One
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orderedPosters.map((poster, index) => (
                <div
                  key={poster._id}
                  draggable={reorderMode}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => !reorderMode && toggleSelect(poster.id)}
                  className={[
                    'bg-white rounded-lg shadow-md p-5 border-2 flex flex-col transition-all',
                    reorderMode ? 'cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95' : 'cursor-pointer',
                    !reorderMode && selected.has(poster.id) ? 'border-blue-500 shadow-blue-100' : 'border-transparent hover:shadow-lg',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {reorderMode && (
                        <span className="text-lg text-gray-400 select-none">⠿</span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sourceColor(poster.source)}`}>
                        {poster.source || 'untagged'}
                      </span>
                      {poster.sortOrder != null && (
                        <span className="text-xs text-gray-400 font-mono">#{poster.sortOrder}</span>
                      )}
                    </div>
                    {!reorderMode && (
                      <input
                        type="checkbox"
                        checked={selected.has(poster.id)}
                        onChange={() => toggleSelect(poster.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-blue-600"
                      />
                    )}
                  </div>

                  <h2 className="text-base font-bold mb-1 text-gray-900 line-clamp-2">{poster.title}</h2>
                  <p className="text-sm text-gray-600 mb-3">by {poster.author}</p>

                  {!reorderMode && (
                    <div className="mt-auto space-y-3">
                      <select
                        value={poster.source || ''}
                        onChange={(e) => { e.stopPropagation(); updateSource(poster.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={savingSource === poster.id}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-800"
                      >
                        <option value="">— untagged —</option>
                        {sources.map((s) => (
                          <option key={s} value={s}>{conferenceName(s)}</option>
                        ))}
                      </select>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Link href={`/view/${poster.id}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 font-medium text-sm hover:underline">
                            View →
                          </Link>
                          <Link href={`/edit/${poster.id}`} onClick={(e) => e.stopPropagation()} className="text-gray-500 text-sm hover:underline">
                            Edit
                          </Link>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePoster(poster.id); }}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden md:block mt-8 pt-6 border-t">
              <Link href="/upload" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Upload Presentations
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
