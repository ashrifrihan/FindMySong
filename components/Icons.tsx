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
export const SettingsIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={1.8}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);
export const VolumeIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={1.9}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
);
export const VolumeMuteIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={1.9}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
);
export const RepeatIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={1.9}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
);
export const ChevronUpIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2}><path d="m18 15-6-6-6 6" /></svg>
);
export const CloseIcon = ({ size, className, style }: P) => (
  <svg {...base(size, className, style)} strokeWidth={2}><path d="M18 6 6 18M6 6l12 12" /></svg>
);

