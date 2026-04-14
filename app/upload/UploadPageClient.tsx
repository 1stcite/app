'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Read PDF metadata in-browser using pdf.js
async function extractPdfMeta(file: File): Promise<{ title: string; author: string }> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const meta = await pdf.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as Record<string, string>;
    return {
      title: (info.Title ?? '').trim(),
      author: (info.Author ?? '').trim(),
    };
  } catch {
    return { title: '', author: '' };
  }
}

function filenameToTitle(name: string) {
  return name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
}

type FileEntry = {
  id: string;
  file: File;
  title: string;
  author: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
  posterId?: string;
};

export default function UploadPage() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addFiles = useCallback(async (files: File[]) => {
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) { alert('Please select PDF files only'); return; }

    // Create entries with filename fallback immediately
    const newEntries: FileEntry[] = pdfs.map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      title: filenameToTitle(f.name),
      author: '',
      status: 'pending',
    }));
    setEntries(prev => [...prev, ...newEntries]);

    // Then try to extract PDF metadata and update
    for (let i = 0; i < pdfs.length; i++) {
      const meta = await extractPdfMeta(pdfs[i]);
      const id = newEntries[i].id;
      setEntries(prev => prev.map(e => e.id === id ? {
        ...e,
        title: meta.title || e.title,
        author: meta.author || e.author,
      } : e));
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles([...e.dataTransfer.files]);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles([...e.target.files]);
  }

  function updateEntry(id: string, patch: Partial<FileEntry>) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  async function uploadOne(entry: FileEntry) {
    updateEntry(entry.id, { status: 'uploading' });
    try {
      const formData = new FormData();
      formData.append('file', entry.file);
      const blobRes = await fetch('/api/upload-blob', { method: 'POST', body: formData });
      if (!blobRes.ok) throw new Error((await blobRes.json()).error || 'Blob upload failed');
      const { url: fileUrl } = await blobRes.json();

      const metaRes = await fetch('/api/posters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title.trim() || filenameToTitle(entry.file.name),
          author: entry.author.trim() || 'Anonymous',
          fileUrl,
        }),
      });
      if (!metaRes.ok) throw new Error((await metaRes.json()).error || 'Metadata save failed');
      const poster = await metaRes.json();
      updateEntry(entry.id, { status: 'done', posterId: poster.id });
    } catch (err) {
      updateEntry(entry.id, { status: 'error', errorMsg: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  async function uploadAll() {
    const pending = entries.filter(e => e.status === 'pending' || e.status === 'error');
    if (!pending.length) return;
    setUploading(true);
    // Upload sequentially to avoid hammering the API
    for (const entry of pending) {
      await uploadOne(entry);
    }
    setUploading(false);
  }

  const pendingCount = entries.filter(e => e.status === 'pending' || e.status === 'error').length;
  const doneCount = entries.filter(e => e.status === 'done').length;
  const allDone = entries.length > 0 && doneCount === entries.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Upload Presentations</h1>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-xl transition-all cursor-pointer mb-6',
            dragOver
              ? 'border-blue-500 bg-blue-50 p-10'
              : entries.length
              ? 'border-gray-200 bg-white p-5 hover:border-blue-400'
              : 'border-gray-300 bg-gray-50 p-10 hover:border-blue-400 hover:bg-blue-50',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="text-center pointer-events-none">
            {entries.length ? (
              <p className="text-sm text-gray-500">
                {dragOver ? 'Drop to add more' : '+ Drop more PDFs or click to add'}
              </p>
            ) : (
              <>
                <div className="text-5xl mb-3">📄</div>
                <p className="text-lg font-medium text-gray-700">
                  {dragOver ? 'Drop to upload' : 'Drag & drop PDFs here'}
                </p>
                <p className="text-sm text-gray-400 mt-1">or click to browse — multiple files supported</p>
              </>
            )}
          </div>
        </div>

        {/* File queue */}
        {entries.length > 0 && (
          <div className="space-y-3 mb-6">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={[
                  'bg-white rounded-lg border p-4 flex gap-4 items-start transition-all',
                  entry.status === 'done' ? 'border-green-200 bg-green-50' :
                  entry.status === 'error' ? 'border-red-200 bg-red-50' :
                  entry.status === 'uploading' ? 'border-blue-200' :
                  'border-gray-200',
                ].join(' ')}
              >
                {/* Status icon */}
                <div className="shrink-0 w-10 h-12 bg-red-100 rounded border border-red-200 flex items-center justify-center mt-1">
                  {entry.status === 'uploading' ? (
                    <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : entry.status === 'done' ? (
                    <span className="text-green-600 text-lg">✓</span>
                  ) : entry.status === 'error' ? (
                    <span className="text-red-500 text-lg">!</span>
                  ) : (
                    <span className="text-red-600 font-bold text-xs">PDF</span>
                  )}
                </div>

                {/* Fields */}
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-xs text-gray-400 truncate">{entry.file.name} · {(entry.file.size / 1024 / 1024).toFixed(1)} MB</p>
                  {entry.status === 'done' ? (
                    <div>
                      <p className="font-semibold text-gray-900">{entry.title}</p>
                      <p className="text-sm text-gray-500">{entry.author || 'Anonymous'}</p>
                      <a href={`/view/${entry.posterId}`} className="text-xs text-blue-600 hover:underline">View →</a>
                    </div>
                  ) : entry.status === 'error' ? (
                    <div>
                      <p className="text-sm text-red-600">{entry.errorMsg}</p>
                      <p className="text-xs text-gray-500 mt-1">Will retry on next upload</p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={entry.title}
                        onChange={e => updateEntry(entry.id, { title: e.target.value })}
                        placeholder="Presentation title *"
                        disabled={entry.status === 'uploading'}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={entry.author}
                        onChange={e => updateEntry(entry.id, { author: e.target.value })}
                        placeholder="Author / Presenter"
                        disabled={entry.status === 'uploading'}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      />
                    </>
                  )}
                </div>

                {/* Remove */}
                {entry.status !== 'uploading' && entry.status !== 'done' && (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="shrink-0 text-gray-300 hover:text-red-400 text-xl leading-none mt-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {entries.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {allDone ? '← Back to library' : 'Cancel'}
            </button>

            {!allDone && (
              <button
                type="button"
                onClick={uploadAll}
                disabled={uploading || pendingCount === 0}
                className="flex-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {uploading
                  ? `Uploading… (${doneCount}/${entries.length})`
                  : `Upload ${pendingCount} presentation${pendingCount !== 1 ? 's' : ''}`}
              </button>
            )}

            {allDone && (
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                ✓ All done — view library
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
