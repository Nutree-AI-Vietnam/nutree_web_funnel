import { cn } from '@/lib/utils';

/** Line icons drawn in the brand stroke, so interface icons look the same on every phone (emoji do not). */
const PATHS = {
  flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5Z" />,
  dumbbell: <path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11" />,
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
  bowl: (
    <>
      <path d="M4 11.5h16a8 8 0 0 1-16 0Z" />
      <path d="M12 11.5c0-3.5 2-5.5 5-6-0.2 3-2.2 5.2-5 6M12 11.5C11.6 9 10 7.6 7.5 7.4c0.2 2.2 1.8 3.7 4.5 4.1" />
    </>
  ),
  plate: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4" />
    </>
  ),
  chat: <path d="M5 5h14v10H10l-5 4V5Z" />,
  shield: (
    <>
      <path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  renew: (
    <>
      <path d="M19.5 10A7.5 7.5 0 0 0 6.2 6.8L4.5 8.5" />
      <path d="M4.5 4.5v4h4" />
      <path d="M4.5 14a7.5 7.5 0 0 0 13.3 3.2l1.7-1.7" />
      <path d="M19.5 19.5v-4h-4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-5 w-5 shrink-0', className)}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
