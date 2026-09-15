/** In-app mark. Keep `frontend/public/favicon.svg` visually in sync with this SVG. */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#0A0A0A" />
      <path
        d="M11 8v7a2.6 2.6 0 0 0 2.6 2.6h0"
        stroke="#A8112A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 8v6M13.6 8v6M16.2 8v6" stroke="#A8112A" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.6 17.6V28" stroke="#A8112A" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M23.5 8c-2.6 0-4.4 2.6-4.4 6.2s1.8 5.4 4.4 5.4"
        stroke="#A8112A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23.5 19.6V28" stroke="#A8112A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BrandWord() {
  return (
    <div className="word">
      CalorieTracker<small>powered by Typeface</small>
    </div>
  );
}
