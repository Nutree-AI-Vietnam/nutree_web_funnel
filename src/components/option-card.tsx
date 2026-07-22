'use client';

import { GlowingCard } from '@/components/ui/glowing-card';
import { cn } from '@/lib/utils';

const brandIcons: Record<string, { path: string; label: string; color: string }> = {
  facebook: {
    label: 'Facebook',
    color: '#0866ff',
    path: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  },
  youtube: {
    label: 'YouTube',
    color: '#ff0000',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  instagram: {
    label: 'Instagram',
    color: '#ff0069',
    path: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  },
  tiktok: {
    label: 'TikTok',
    color: '#000000',
    path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  },
};

function GoogleMark({ compact }: { compact?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={compact ? 'h-4 w-4' : 'h-5 w-5'} role="img" aria-label="Google">
      <path fill="#4285f4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.5a5.5 5.5 0 0 1-2.4 3.6v2.9h3.8c2.2-2 3.6-5.1 3.6-8.5Z" />
      <path fill="#34a853" d="M12 24c3.2 0 5.9-1.1 7.9-3.1l-3.8-2.9c-1.1.7-2.4 1.1-4.1 1.1-3.1 0-5.7-2.1-6.6-4.9H1.5v3C3.5 21.2 7.5 24 12 24Z" />
      <path fill="#fbbc05" d="M5.4 14.2a7.2 7.2 0 0 1 0-4.4v-3H1.5a12 12 0 0 0 0 10.4l3.9-3Z" />
      <path fill="#ea4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A11.4 11.4 0 0 0 12 0C7.5 0 3.5 2.8 1.5 6.8l3.9 3C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

function SourceGlyph({ icon, compact }: { icon: string; compact?: boolean }) {
  const size = compact ? 'h-4 w-4' : 'h-5 w-5';

  if (icon === 'people') {
    return (
      <svg viewBox="0 0 24 24" className={size} fill="none" aria-hidden="true">
        <circle cx="9" cy="8.2" r="3.2" fill="#1a4739" />
        <circle cx="16.5" cy="9.4" r="2.6" fill="#29b6a1" />
        <path d="M3.8 20c.7-4 2.6-6 5.6-6s4.9 2 5.6 6" fill="#1a4739" />
        <path d="M13.6 20c.5-2.8 1.8-4.2 3.8-4.2 1.8 0 3 1.2 3.6 3.5" fill="#29b6a1" opacity=".9" />
      </svg>
    );
  }

  if (icon === 'spark') {
    return (
      <svg viewBox="0 0 24 24" className={size} fill="none" aria-hidden="true">
        <path d="M12 2.8 14.2 9l6.2 2.2-6.2 2.2L12 19.6l-2.2-6.2-6.2-2.2L9.8 9 12 2.8Z" fill="#29b6a1" />
        <path d="M18.5 16.2 19.4 19l2.8.9-2.8 1-.9 2.7-1-2.7-2.7-1 2.7-.9 1-2.8Z" fill="#1a4739" />
      </svg>
    );
  }

  return null;
}

function OptionIcon({ icon, compact }: { icon: string; compact?: boolean }) {
  const brand = brandIcons[icon];

  if (icon === 'google' || icon === 'people' || icon === 'spark') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-white/88 shadow-sm ring-1 ring-border-brand/70',
          compact ? 'h-7 w-7' : 'h-10 w-10',
        )}
      >
        {icon === 'google' ? <GoogleMark compact={compact} /> : <SourceGlyph icon={icon} compact={compact} />}
      </span>
    );
  }

  if (brand) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-white/88 shadow-sm ring-1 ring-border-brand/70',
          compact ? 'h-7 w-7' : 'h-10 w-10',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'}
          fill={brand.color}
          role="img"
          aria-label={brand.label}
        >
          <path d={brand.path} />
        </svg>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-white/88 font-extrabold text-forest shadow-sm ring-1 ring-border-brand/70',
        compact ? 'h-7 w-7 text-xs' : 'h-10 w-10 text-sm',
      )}
    >
      {icon}
    </span>
  );
}

export function OptionCard({
  label,
  icon,
  compact,
  selected,
  onClick,
}: {
  label: string;
  icon?: string;
  compact?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <GlowingCard active={selected} compact={compact}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          'flex w-full items-center justify-between gap-3 text-left font-semibold transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-teal-brand/20 active:scale-[0.99] group-hover:translate-x-0.5',
          compact ? 'min-h-11 px-4 py-2.5 text-sm' : 'min-h-[3.25rem] px-5 py-4 text-base',
          selected ? 'text-forest' : 'text-charcoal hover:text-forest',
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          {icon && <OptionIcon icon={icon} compact={compact} />}
          <span className="min-w-0">{label}</span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full text-sm transition-all duration-300',
            compact ? 'h-5 w-5 text-[0.7rem]' : 'h-6 w-6',
            selected
              ? 'scale-100 bg-[linear-gradient(135deg,#34d0b4,#1fa892)] text-white shadow-[0_6px_16px_rgb(31_168_146_/_0.40)]'
              : 'scale-50 border border-dashed border-border-brand bg-transparent text-transparent opacity-0 group-hover:scale-75 group-hover:opacity-100',
          )}
        >
          ✓
        </span>
      </button>
    </GlowingCard>
  );
}
