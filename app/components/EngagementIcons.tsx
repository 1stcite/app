"use client";

/** Star icon — interest/curious signal */
export function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

/** Chair icon — attend signal */
export function ChairIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg className="w-5 h-5" viewBox="-19.82 0 122.88 122.88"
      fill={filled ? color : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? 0 : 6}
    >
      <path d="M3.28,0h8.62c1.76,0,2.92,1.46,3.2,3.2c3.26,20.54,5.02,41.07,4.93,61.61H79c2.33,0,4.23,1.91,4.23,4.23v8.55 h-3.38v43.71c0,0.7-0.58,1.29-1.29,1.29H67.26c-0.71,0-1.29-0.58-1.29-1.29v-19.02H17.71c-0.7,5.8-1.57,11.6-2.61,17.4 c-0.31,1.73-1.44,3.2-3.2,3.2H3.28c-1.76,0-3.69-1.51-3.2-3.2c11.36-39.56,9-78.23,0-116.48C-0.33,1.49,1.52,0,3.28,0L3.28,0z M65.97,96.4v-18.8H19.85c-0.26,8-0.81,10.81-1.67,18.8H65.97L65.97,96.4z" />
    </svg>
  );
}

/** Disc / floppy icon — save to library signal */
export function DiscIcon({ filled, color }: { filled: boolean; color: string }) {
  if (filled) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color} stroke="none">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <rect x="7" y="3" width="10" height="7" rx="1" fill="white" opacity="0.9" />
        <rect x="5" y="14" width="14" height="5" rx="1.5" fill="white" opacity="0.3" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="3" width="10" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="14" width="14" height="5" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
