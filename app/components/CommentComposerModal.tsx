'use client';

import React, { useEffect, useRef, useState } from 'react';

type VisibilityType = 'note' | 'question' | 'public';

export default function CommentComposerModal({
  open,
  page,
  numPages,
  mode,
  initialText,
  onClose,
  onSubmit,
}: {
  open: boolean;
  page: number;
  numPages: number;
  mode: 'add' | 'edit';
  initialText?: string;
  onClose: () => void;
  onSubmit: (payload: { text: string; visibilityType: VisibilityType }) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(initialText ?? '');
  const [visibilityType, setVisibilityType] = useState<VisibilityType>('public');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(initialText ?? '');
    if (mode === 'add') setVisibilityType('public');
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [open, page, mode, initialText]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (draft.trim()) onSubmit({ text: draft.trim(), visibilityType });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, draft, visibilityType, onClose, onSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-x-0 top-10 mx-auto w-[min(720px,calc(100vw-24px))] rounded-xl bg-white shadow-xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm font-semibold">
            {mode === 'edit' ? 'Edit comment' : 'Add comment'} · Slide {page} / {numPages || '?'}
          </div>
          <button className="text-sm px-3 py-1.5 rounded-md border" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-4">
          {/* Visibility */}
          <div className="mb-3 flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700">Visibility</label>
            <select
              value={visibilityType}
              onChange={(e) => setVisibilityType(e.target.value as VisibilityType)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="note">Note (only me)</option>
              <option value="question">Question (me + presenter)</option>
              <option value="public">Public (everyone)</option>
            </select>
          </div>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={7}
            className="w-full border rounded p-3 text-gray-900 placeholder-gray-400"
            placeholder={`Write a comment for slide ${page}…`}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-xs text-gray-700">
              Tip: Ctrl/⌘ + Enter to {mode === 'edit' ? 'save' : 'post'}
            </div>

            <button
              onClick={() => onSubmit({ text: draft.trim(), visibilityType })}
              disabled={!draft.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300"
            >
              {mode === 'edit' ? 'Save' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}