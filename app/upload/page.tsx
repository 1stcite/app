'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [abstract, setAbstract] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const acceptFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file');
      return;
    }
    setFile(f);
    // Auto-fill title from filename if blank
    setTitle((prev) => {
      if (prev.trim()) return prev;
      return f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) {
      alert('Please select a file and enter a title');
      return;
    }

    setUploading(true);

    try {
      // Step 1: Upload PDF to Vercel Blob
      const formData = new FormData();
      formData.append('file', file);

      const blobResponse = await fetch('/api/upload-blob', {
        method: 'POST',
        body: formData,
      });

      if (!blobResponse.ok) {
        const error = await blobResponse.json();
        throw new Error(error.error || 'Blob upload failed');
      }

      const { url: fileUrl } = await blobResponse.json();

      // Step 2: Save metadata to MongoDB
      const response = await fetch('/api/posters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim() || 'Anonymous',
          fileUrl,
          abstract: abstract.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save metadata: ${errorData.error || 'Unknown error'}`);
      }

      const poster = await response.json();
      router.push(`/view/${poster.id}`);
    } catch (error) {
      console.error('Error uploading:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Upload Presentation</h1>

        <form onSubmit={handleUpload} className="bg-white rounded-lg shadow-lg p-6 space-y-6">

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && fileInputRef.current?.click()}
            className={[
              'relative border-2 border-dashed rounded-xl transition-all',
              file
                ? 'border-green-400 bg-green-50 p-5'
                : dragOver
                ? 'border-blue-500 bg-blue-50 p-10 cursor-copy'
                : 'border-gray-300 bg-gray-50 p-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50',
            ].join(' ')}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
            />

            {file ? (
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-14 bg-red-100 rounded-lg flex flex-col items-center justify-center border border-red-200">
                  <span className="text-red-600 font-bold text-xs">PDF</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="shrink-0 text-gray-400 hover:text-red-500 transition-colors text-xl leading-none"
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="text-center pointer-events-none">
                <div className="text-5xl mb-3">📄</div>
                <p className="text-lg font-medium text-gray-700">
                  {dragOver ? 'Drop to upload' : 'Drag & drop your PDF here'}
                </p>
                <p className="text-sm text-gray-400 mt-1">or click to browse</p>
              </div>
            )}
          </div>

          {file && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-600 hover:underline -mt-2 block"
            >
              Choose a different file
            </button>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presentation Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Novel Mechanisms in MS Pathology"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Author / Presenter
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abstract
            </label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Paste your abstract here (optional — enables full-text search)"
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-vertical"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Uploading…
                </span>
              ) : 'Upload Presentation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
