"use client";

/**
 * Attendee view | Presenter view switch, shown to a talk's presenter (and
 * organizers) on both the talk page and the presenter page.
 */
export default function ViewSwitch({
  current,
  onAttendee,
  presenterHref,
  compact = false,
}: {
  current: "attendee" | "presenter";
  onAttendee?: () => void;
  presenterHref?: string;
  compact?: boolean;
}) {
  const base = compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const on = "bg-white text-gray-900 shadow-sm";
  const off = "text-gray-600 hover:text-gray-900";
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5 font-medium whitespace-nowrap" role="tablist" aria-label="Switch view">
      {current === "attendee" ? (
        <span className={`${base} rounded-md ${on}`} aria-selected>Attendee view</span>
      ) : (
        <button type="button" onClick={onAttendee} className={`${base} rounded-md ${off}`}>Attendee view</button>
      )}
      {current === "presenter" ? (
        <span className={`${base} rounded-md ${on}`} aria-selected>Presenter view</span>
      ) : (
        <a href={presenterHref} className={`${base} rounded-md ${off}`}>Presenter view</a>
      )}
    </div>
  );
}
