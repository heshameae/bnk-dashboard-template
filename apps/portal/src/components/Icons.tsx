/* 16px line icons on a 16px box, 1.5 stroke — the weight used across the chrome. */
type P = { size?: number; className?: string };
const svg = (d: React.ReactNode, { size = 16, className }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {d}
  </svg>
);

export const Search = (p: P) => svg(<><circle cx="7.2" cy="7.2" r="4.2" /><path d="M10.4 10.4 13.2 13.2" /></>, p);
export const ChevronDown = (p: P) => svg(<path d="m4 6.2 4 3.6 4-3.6" />, p);
export const ChevronRight = (p: P) => svg(<path d="m6.2 4 3.6 4-3.6 4" />, p);
export const ChevronLeft = (p: P) => svg(<path d="M9.8 4 6.2 8l3.6 4" />, p);
export const Star = (p: P) => svg(<path d="m8 2.6 1.7 3.4 3.7.5-2.7 2.6.6 3.7L8 11.1l-3.3 1.7.6-3.7L2.6 6.5l3.7-.5z" />, p);
export const Help = (p: P) => svg(<><circle cx="8" cy="8" r="6" /><path d="M6.4 6.2a1.7 1.7 0 1 1 1.9 1.9v1" /><path d="M8.2 11.6h.01" /></>, p);
export const More = (p: P) => svg(<><circle cx="8" cy="3.4" r=".9" fill="currentColor" /><circle cx="8" cy="8" r=".9" fill="currentColor" /><circle cx="8" cy="12.6" r=".9" fill="currentColor" /></>, p);
export const Plus = (p: P) => svg(<><path d="M8 3.6v8.8" /><path d="M3.6 8h8.8" /></>, p);
export const Expand = (p: P) => svg(<><rect x="2.6" y="2.6" width="10.8" height="10.8" rx="2.4" /><path d="M9.6 6.4 6.4 9.6" /></>, p);
export const PanelLeft = (p: P) => svg(<><rect x="2.2" y="3" width="11.6" height="10" rx="2.2" /><path d="M6.4 3v10" /></>, p);
export const Warning = (p: P) => svg(<><path d="M8 2.8 14 12.8H2z" /><path d="M8 6.6v3" /><path d="M8 11.5h.01" /></>, p);
export const Shield = (p: P) => svg(<path d="M8 2.4 13 4.2v3.6c0 2.9-2 4.9-5 5.8-3-.9-5-2.9-5-5.8V4.2z" />, p);
export const Key = (p: P) => svg(<><circle cx="5.6" cy="10.4" r="2.6" /><path d="m7.6 8.6 5-5" /><path d="m10.6 5.6 1.4 1.4" /></>, p);
export const Link = (p: P) => svg(<><path d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l1.9-1.9a2.6 2.6 0 0 0-3.7-3.7l-.9.9" /><path d="M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.8 8.5a2.6 2.6 0 0 0 3.7 3.7l.9-.9" /></>, p);
export const Fact = (p: P) => svg(<><rect x="2.2" y="2.6" width="11.6" height="10.8" rx="2.2" /><path d="M2.2 6.2h11.6" /><path d="M6.4 6.2v7.2" /></>, p);
export const Dimension = (p: P) => svg(<><rect x="2.2" y="2.6" width="11.6" height="10.8" rx="2.2" /><path d="M2.2 6.2h11.6" /></>, p);
export const Database = (p: P) => svg(<><ellipse cx="8" cy="4" rx="5.2" ry="2" /><path d="M2.8 4v8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V4" /><path d="M2.8 8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2" /></>, p);
export const Calendar = (p: P) => svg(<><rect x="2.4" y="3.4" width="11.2" height="10.2" rx="2.2" /><path d="M2.4 6.6h11.2" /><path d="M5.6 2.2v2.4" /><path d="M10.4 2.2v2.4" /></>, p);
export const Recipe = (p: P) => svg(<><path d="M3 12.8V8.4" /><path d="M6.6 12.8V4.2" /><path d="M10.2 12.8V6.8" /><path d="M13.8 12.8v-3" /></>, p);
export const Hand = (p: P) => svg(<path d="M5 7.4V4.2a1.1 1.1 0 0 1 2.2 0v2.8m0-.4V3.4a1.1 1.1 0 0 1 2.2 0v3.2m0-.4a1.1 1.1 0 0 1 2.2 0v3.4c0 2.2-1.6 3.8-3.8 3.8-2 0-3-1-4-2.4L2.9 9.2a1.1 1.1 0 0 1 1.8-1.3z" />, p);
export const Cursor = (p: P) => svg(<path d="M3.4 2.8 12.8 7 8.9 8.6 7.4 12.6z" />, p);
export const Fit = (p: P) => svg(<><path d="M2.6 6V3.8a1.2 1.2 0 0 1 1.2-1.2H6" /><path d="M10 2.6h2.2a1.2 1.2 0 0 1 1.2 1.2V6" /><path d="M13.4 10v2.2a1.2 1.2 0 0 1-1.2 1.2H10" /><path d="M6 13.4H3.8a1.2 1.2 0 0 1-1.2-1.2V10" /></>, p);
export const Check = (p: P) => svg(<path d="m3.4 8.4 3 3 6.2-6.8" />, p);
export const Clock = (p: P) => svg(<><circle cx="8" cy="8" r="5.6" /><path d="M8 4.8V8l2.2 1.4" /></>, p);
export const Text = (p: P) => svg(<><path d="M3.4 4.4V3.2h9.2v1.2" /><path d="M8 3.2v9.6" /><path d="M6.2 12.8h3.6" /></>, p);
export const Hash = (p: P) => svg(<><path d="M6 2.8 4.8 13.2" /><path d="M11.2 2.8 10 13.2" /><path d="M3 6h10" /><path d="M2.6 10h10" /></>, p);
export const Flag = (p: P) => svg(<><path d="M4 13.4V3" /><path d="M4 3.6h7.4l-1.6 2.6 1.6 2.6H4" /></>, p);
export const Minus = (p: P) => svg(<path d="M3.6 8h8.8" />, p);
export const ZoomOut = (p: P) => svg(<><circle cx="7.2" cy="7.2" r="4.2" /><path d="M5.4 7.2h3.6" /><path d="M10.4 10.4 13.2 13.2" /></>, p);
export const ZoomIn = (p: P) => svg(<><circle cx="7.2" cy="7.2" r="4.2" /><path d="M5.4 7.2h3.6" /><path d="M7.2 5.4v3.6" /><path d="M10.4 10.4 13.2 13.2" /></>, p);
export const PanelRight = (p: P) => svg(<><rect x="2.2" y="3" width="11.6" height="10" rx="2.2" /><path d="M9.6 3v10" /></>, p);
