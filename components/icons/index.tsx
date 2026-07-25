type IconProps = React.SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconGlobe(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.7 3 2.7 15 0 18M12 3c-2.7 3-2.7 15 0 18" />
    </svg>
  );
}

export function IconLightning(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

export function IconShield(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconCoin(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9h4.5a2 2 0 010 4H9m0 0h5a2 2 0 010 4H9V8" />
    </svg>
  );
}

export function IconExchange(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M4 7h13l-3-3M20 17H7l3 3" />
    </svg>
  );
}

export function IconCard(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

export function IconUsers(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14c3 0 6 1.8 6 5" />
    </svg>
  );
}

export function IconBank(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" />
    </svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconArrowRight(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconMenu(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconX(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M3 3l18 18M21 3L3 21" />
    </svg>
  );
}

export function IconLinkedIn(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M4 4h4v4H4zM4 10h4v10H4zM10 10h4v2c1-1.5 2.5-2.5 4.5-2.5 3 0 4.5 2 4.5 5V20h-4v-5c0-1.4-.6-2.5-2-2.5s-2 1.1-2 2.5v5h-5V10z" />
    </svg>
  );
}

export function IconYouTube(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M22 8.4c-.2-1.6-.9-2.4-2.5-2.6C17.2 5.5 12 5.5 12 5.5s-5.2 0-7.5.3C2.9 6 2.2 6.8 2 8.4 1.7 10.7 1.7 12 1.7 12s0 1.3.3 3.6c.2 1.6.9 2.4 2.5 2.6 2.3.3 7.5.3 7.5.3s5.2 0 7.5-.3c1.6-.2 2.3-1 2.5-2.6.3-2.3.3-3.6.3-3.6s0-1.3-.3-3.6zM10 15V9l5 3-5 3z" />
    </svg>
  );
}

export function IconUserCircle(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
    </svg>
  );
}

export function IconChart(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M3 20h18M5 16l4-5 3 3 5-7 3 4" />
    </svg>
  );
}

export function IconClock(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconLock(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

export function IconDocument(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9 13h7M9 17h5" />
    </svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M20 14.5A8 8 0 019.5 4a7 7 0 100 16 8 8 0 0010.5-5.5z" />
    </svg>
  );
}
