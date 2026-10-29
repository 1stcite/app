'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Presenter notes for one slide.
 *
 * Presenters can write their whole talk here, slide by slide: the editor
 * grows with the text and saves automatically (a moment after typing stops,
 * on blur, and before switching slides). Attendees see the notes as
 * readable text under the slide.
 */
export default function SlideNotes({
  page,
  note,
  isPresenter,
  onSave,
  size = 'full',
}: {
  page: number;
  note: string;
  isPresenter: boolean;
  onSave: (note: string, page: number) => Promise<void>;
  size?: 'full' | 'compact';
}) {
  const [text, setText] = useState(note);
  const [status, setStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // What's pending, and for which slide, so a slide change saves to the right slide
  const pending = useRef<{ page: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  async function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    setStatus('saving');
    await onSaveRef.current(p.text, p.page);
    setStatus('saved');
  }

  // New slide: save the previous slide's edits, then load this slide's note
  useEffect(() => {
    setText(note);
    setStatus('idle');
    return () => {
      void flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Keep in sync if the saved note changes underneath us (and we have no unsaved edits)
  useEffect(() => {
    if (!pending.current) setText(note);
  }, [note]);

  // Grow the editor with its content
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, size === 'full' ? 160 : 96)}px`;
  }, [text, size]);

  // Save on leaving the page
  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  function onChange(v: string) {
    setText(v);
    pending.current = { page, text: v };
    setStatus('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1500);
  }

  const trimmed = (text ?? '').trim();

  if (!isPresenter) {
    if (!trimmed) return null;
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1.5">From the presenter</p>
        <div className={`${size === 'full' ? 'text-[15px]' : 'text-sm'} leading-relaxed text-gray-800 whitespace-pre-wrap`}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Your notes for slide {page}
        </p>
        <span className="text-xs text-gray-500">
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'dirty' ? 'Editing…' : 'Visible to attendees'}
        </span>
      </div>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => void flush()}
        placeholder="Write what you'd say on this slide. Attendees read it alongside the slide. Saves automatically."
        className={`w-full resize-none rounded-md border border-amber-200 bg-white px-3 py-2 ${size === 'full' ? 'text-[15px]' : 'text-sm'} leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300`}
      />
    </div>
  );
}
