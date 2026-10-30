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

  // Show / hide, remembered on this device. Collapsed by default for everyone,
  // so a long note never pushes the comments out of view.
  const prefKey = isPresenter ? 'px_notes_open_presenter_v2' : 'px_notes_open_reader_v2';
  const [pref, setPref] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(prefKey);
      if (v !== null) setPref(v === '1');
    } catch {}
  }, [prefKey]);
  const open = pref ?? false;
  function toggleOpen() {
    const next = !open;
    setPref(next);
    try {
      localStorage.setItem(prefKey, next ? '1' : '0');
    } catch {}
  }
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
    // Grow with the text up to a cap, then scroll inside, so the comments below stay close
    const cap = Math.round(window.innerHeight * (size === 'full' ? 0.35 : 0.4));
    el.style.height = 'auto';
    const want = Math.max(el.scrollHeight, size === 'full' ? 160 : 96);
    el.style.height = `${Math.min(want, cap)}px`;
    el.style.overflowY = want > cap ? 'auto' : 'hidden';
  }, [text, size, open]);

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

  if (!isPresenter && !trimmed) return null;

  const label = isPresenter ? `Your notes for slide ${page}` : 'From the presenter';
  const textSize = size === 'full' ? 'text-[15px]' : 'text-sm';
  // When open, long notes scroll inside the box rather than burying the comments
  const maxH = size === 'full' ? 'max-h-[35vh]' : 'max-h-[40vh]';
  const preview = trimmed.replace(/\s+/g, ' ');
  const statusLabel =
    status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'dirty' ? 'Editing…' : 'Visible to attendees';

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60">
      {/* Header: click to show or hide; the choice is remembered on this device */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-2 text-left"
      >
        <span className="min-w-0 flex items-center gap-2">
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-amber-700 transition-transform ${open ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path d="M7 5l6 5-6 5V5z" />
          </svg>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-amber-700">
            {isPresenter && !trimmed && !open ? `Add notes for slide ${page}` : label}
          </span>
          {!open && preview && (
            <span className="min-w-0 truncate text-xs text-gray-500">{preview}</span>
          )}
        </span>
        <span className="shrink-0 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-800">
          {open ? 'Hide' : isPresenter && !trimmed ? 'Add' : 'Show'}
        </span>
      </button>

      {open && (
        <div className={`px-4 pb-3 ${isPresenter ? '' : `${maxH} overflow-y-auto`}`}>
          {isPresenter && (
            <p className="mb-1 text-xs text-gray-500">{statusLabel}</p>
          )}
          {isPresenter ? (
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => void flush()}
              placeholder="Write what you'd say on this slide. Attendees read it alongside the slide. Saves automatically."
              className={`w-full resize-none rounded-md border border-amber-200 bg-white px-3 py-2 ${textSize} leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300`}
            />
          ) : (
            <div className={`${textSize} leading-relaxed text-gray-800 whitespace-pre-wrap`}>{text}</div>
          )}
        </div>
      )}
    </div>
  );
}
