'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

async function extractPdfMeta(file: File): Promise<{ title: string; author: string }> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string);
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
      `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version}/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
    const meta = await pdf.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as Record<string, string>;
    return { title: (info.Title ?? '').trim(), author: (info.Author ?? '').trim() };
  } catch {
    return { title: '', author: '' };
  }
}

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [abstract, setAbstract] = useState('');
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [replaceFile, setReplaceFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/posters/${id}`)
      .then(r => r.json())
      .then(poster => {
        setTitle(poster.title ?? '');
        setAuthor(poster.author ?? '');
        setAbstract(poster.abstract ?? '');
        setCurrentFileUrl(poster.fileUrl ?? '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) { alert('PDF files only'); return; }
    setNewFile(f);
    const meta = await extractPdfMeta(f);
    if (meta.title) setTitle(prev => prev || meta.title);
    if (meta.author) setAuthor(prev => prev || meta.author);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }

  async function handleSave() {
    if (!title.trim()) { alert('Title is required'); return; }
    setSaving(true);
    try {
      let fileUrl = currentFileUrl;

      // Upload new PDF if provided
      if (newFile) {
        const formData = new FormData();
        formData.append('file', newFile);
        const blobRes = await fetch('/api/upload-blob', { method: 'POST', body: formData });
        if (!blobRes.ok) throw new Error((await blobRes.json()).error || 'Upload failed');
        fileUrl = (await blobRes.json()).url;
      }

      const res = await fetch(`/api/posters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), author: author.trim(), abstract: abstract.trim(), fileUrl }),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      router.push(`/view/${id}`);
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Edit Presentation</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presentation Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Author / Presenter</label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Anonymous"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Abstract</label>
            <textarea
              value={abstract}
              onChange={e => setAbstract(e.target.value)}
              placeholder="Paste your abstract here (enables full-text search)"
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-vertical"
            />
          </div>

          {/* PDF replacement */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">PDF File</label>
              {!replaceFile && (
                <button
                  type="button"
                  onClick={() => setReplaceFile(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Replace PDF
                </button>
              )}
            </div>

            {!replaceFile ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="w-9 h-10 bg-red-100 rounded border border-red-200 flex items-center justify-center shrink-0">
                  <span className="text-red-600 font-bold text-xs">PDF</span>
                </div>
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate"
                >
                  Current file →
                </a>
              </div>
            ) : (
              <>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
                  onClick={() => !newFile && fileInputRef.current?.click()}
                  className={[
                    'border-2 border-dashed rounded-xl transition-all',
                    newFile ? 'border-green-400 bg-green-50 p-4' :
                    dragOver ? 'border-blue-500 bg-blue-50 p-8 cursor-copy' :
                    'border-gray-300 bg-gray-50 p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50',
                  ].join(' ')}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} className="hidden" />
                  {newFile ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-10 bg-red-100 rounded border border-red-200 flex items-center justify-center shrink-0">
                        <span className="text-red-600 font-bold text-xs">PDF</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{newFile.name}</p>
                        <p className="text-xs text-gray-500">{(newFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); setNewFile(null); }} className="text-gray-400 hover:text-red-500 text-xl">×</button>
                    </div>
                  ) : (
                    <div className="text-center pointer-events-none">
                      <div className="text-4xl mb-2">📄</div>
                      <p className="text-sm font-medium text-gray-700">{dragOver ? 'Drop to replace' : 'Drag & drop new PDF'}</p>
                      <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { setReplaceFile(false); setNewFile(null); }} className="text-sm text-gray-500 hover:underline mt-2 block">
                  Keep current file
                </button>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push(`/view/${id}`)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Saving…
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
