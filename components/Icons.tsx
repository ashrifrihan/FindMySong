import React from "react";

type P = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  filled?: boolean;
};

const base = (size = 20, className?: string, style?: React.CSSProperties) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  style,
  "aria-hidden": true,
});

export const SearchIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const BookmarkIcon = ({ size, filled, className, style }: P) => (
  <svg {...base(size, className, style)} fill={filled ? "currentColor" : "none"}><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z" /></svg>
);
export const PlayIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} fill="currentColor" stroke="none"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
);
export const PauseIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
);
export const CopyIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)}><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></svg>
);
export const CheckIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2.4}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const ArrowUpIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2.4}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const NoteIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
);
export const GlassIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" stroke="none" opacity=".35" /></svg>
);
export const SunIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
);
export const MoonIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
);
export const BoltIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
);
export const ChevronDownIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
);
export const SparklesIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} fill="currentColor" stroke="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
);
export const ArrowRightIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2.2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);
