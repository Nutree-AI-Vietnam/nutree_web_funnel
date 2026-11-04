import type { ArtId } from '@/lib/quiz/vi-survey';

/**
 * Original Nutree illustrations. Flat shapes only, no text, no borrowed artwork.
 * forest #14473A, mint #DDF1E8, coral #F08A6B, amber #F2C14E.
 */
const FOREST = '#14473A';
const MINT = '#DDF1E8';
const CORAL = '#F08A6B';
const AMBER = '#F2C14E';
const GREEN = '#2F9E6B';

const WIDE = new Set<ArtId>([
  'table',
  'takeaway',
  'calendar',
  'phoneBowl',
  'plate',
  'zigzag',
  'twoLines',
  'hands',
  'path',
]);

export type PlateEmphasis = 'green' | 'amber' | 'coral';

const DOT: Record<PlateEmphasis, string> = {
  green: GREEN,
  amber: AMBER,
  coral: CORAL,
};

/** A food-group colour sitting beside a quiz title. */
export function GroupDot({ tone }: { tone: PlateEmphasis }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="inline-block shrink-0">
      <circle cx="7" cy="7" r="6" fill={DOT[tone]} />
    </svg>
  );
}

export function Art({
  id,
  size = 120,
  emphasis,
}: {
  id: ArtId;
  size?: number;
  emphasis?: PlateEmphasis;
}) {
  const wide = WIDE.has(id);
  const height = size;
  const width = wide ? Math.round(size * (200 / 120)) : size;
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={wide ? '0 0 200 120' : '0 0 120 120'}
      fill="none"
      className="max-w-full"
    >
      {scene(id, emphasis)}
    </svg>
  );
}

function scene(id: ArtId, emphasis?: PlateEmphasis) {
  switch (id) {
    case 'traits':
      return (
        <>
          <circle cx="36" cy="36" r="24" fill={MINT} />
          <circle cx="28" cy="36" r="3.2" fill={FOREST} />
          <circle cx="36" cy="36" r="3.2" fill={FOREST} />
          <circle cx="44" cy="36" r="3.2" fill={FOREST} />
          <circle cx="84" cy="36" r="24" fill={AMBER} />
          <circle cx="84" cy="32" r="8" fill="#FFF6D8" />
          <rect x="80" y="40" width="8" height="4" rx="1" fill={FOREST} />
          <circle cx="36" cy="84" r="24" fill="#F8E7C8" />
          <path d="M40 70 30 86h8l-3 14 14-18h-8l4-12Z" fill={FOREST} />
          <circle cx="84" cy="84" r="24" fill={CORAL} />
          <path d="M72 82h12c0 6-2 9-6 9s-6-3-6-9Z" fill="#FFF6F2" />
          <path d="M86 82h12c0 6-2 9-6 9s-6-3-6-9Z" fill={MINT} />
        </>
      );
    case 'steady':
      return (
        <>
          {[28, 44, 60, 76, 92].map((x) => (
            <circle key={x} cx={x} cy="60" r={x === 60 ? 11 : 7} fill={x === 60 ? FOREST : MINT} stroke={FOREST} strokeWidth="3" />
          ))}
        </>
      );
    case 'curious':
    case 'bulb':
      return (
        <>
          <circle cx="60" cy="48" r="30" fill={AMBER} />
          <path d="M46 50c6-14 22-14 28 0" stroke="#FFF6D8" strokeWidth="4" strokeLinecap="round" />
          <rect x="48" y="76" width="24" height="8" rx="2" fill={FOREST} />
          <rect x="51" y="86" width="18" height="7" rx="2" fill={FOREST} />
        </>
      );
    case 'practical':
      return (
        <>
          <path d="M54 14 32 54h16L36 100l40-52H58l8-34Z" fill={AMBER} />
          <path d="M22 86h52c0 14-10 22-26 22S22 100 22 86Z" fill={MINT} stroke={FOREST} strokeWidth="4" />
          <path d="M30 86h36" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'warm':
      return (
        <>
          <path d="M14 52h40v6c0 18-8 30-20 30S14 76 14 58v-6Z" fill={MINT} stroke={FOREST} strokeWidth="4" />
          <path d="M66 52h40v6c0 18-8 30-20 30S66 76 66 58v-6Z" fill={CORAL} stroke={FOREST} strokeWidth="4" />
          <path d="M20 58h28M72 58h28" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'table':
      return (
        <>
          <ellipse cx="100" cy="96" rx="72" ry="12" fill={MINT} />
          <path d="M36 78h128c6 10 6 18 0 24H36c-6-6-6-14 0-24Z" fill="#F7FBF8" stroke={FOREST} strokeWidth="4" />
          <path d="M42 70h28v4c0 10-6 16-14 16s-14-6-14-16v-4Z" fill={CORAL} stroke={FOREST} strokeWidth="3" />
          <path d="M86 58h28v4c0 10-6 16-14 16s-14-6-14-16v-4Z" fill={AMBER} stroke={FOREST} strokeWidth="3" />
          <path d="M130 70h28v4c0 10-6 16-14 16s-14-6-14-16v-4Z" fill={GREEN} stroke={FOREST} strokeWidth="3" />
        </>
      );
    case 'takeaway':
      return (
        <>
          <rect x="24" y="40" width="96" height="62" rx="12" fill={AMBER} stroke={FOREST} strokeWidth="4" />
          <path d="M48 40v-6a24 16 0 0 1 48 0v6" stroke={FOREST} strokeWidth="4" />
          <path d="M40 62h64" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
          <circle cx="156" cy="48" r="28" fill={MINT} stroke={FOREST} strokeWidth="4" />
          <path d="M156 48V32M156 48l14 8" stroke={FOREST} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case 'calendar':
      return (
        <>
          <rect x="22" y="26" width="156" height="78" rx="14" fill="#F7FBF8" stroke={FOREST} strokeWidth="4" />
          <path d="M22 42h156" stroke={FOREST} strokeWidth="4" />
          <circle cx="46" cy="34" r="4" fill={CORAL} />
          <circle cx="154" cy="34" r="4" fill={AMBER} />
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <rect key={day} x={34 + day * 20} y={56} width="14" height="16" rx="3" fill={day === 4 ? CORAL : MINT} />
          ))}
          <path d="M36 64l3 4 7-8M56 64l3 4 7-8M76 64l3 4 7-8M96 64l3 4 7-8M116 64l3 4 7-8M136 64l3 4 7-8M156 64l3 4 7-8" stroke={FOREST} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'phoneBowl':
      return (
        <>
          <rect x="28" y="16" width="64" height="96" rx="12" fill={FOREST} />
          <rect x="34" y="26" width="52" height="70" rx="4" fill={MINT} />
          <circle cx="60" cy="104" r="3" fill={AMBER} />
          <path d="M112 78h56c0 18-12 28-28 28s-28-10-28-28Z" fill={CORAL} stroke={FOREST} strokeWidth="4" />
          <path d="M124 78h32" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'plate':
      return (
        <>
          <ellipse cx="86" cy="68" rx="58" ry="30" fill="#F7FBF8" stroke={FOREST} strokeWidth="5" />
          <ellipse cx="86" cy="68" rx="30" ry="14" fill={MINT} />
          <path d="M160 24v58" stroke={FOREST} strokeWidth="4" strokeLinecap="round" />
          <path d="M152 24v20M160 24v26M168 24v20" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'zigzag':
      return (
        <>
          <path d="M12 72 48 28l40 64 36-58 28 30 28-16" stroke={CORAL} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="180" cy="48" r="7" fill={FOREST} />
        </>
      );
    case 'bell':
      return (
        <>
          <rect x="54" y="14" width="12" height="12" rx="3" fill={FOREST} />
          <path d="M60 26c-20 4-28 20-28 36v12h56V62c0-16-8-32-28-36Z" fill={AMBER} stroke={FOREST} strokeWidth="4" />
          <rect x="26" y="74" width="68" height="10" rx="4" fill={FOREST} />
          <circle cx="60" cy="96" r="8" fill={CORAL} />
        </>
      );
    case 'twoLines':
      return (
        <>
          <path d="M16 38h168" stroke={FOREST} strokeWidth="6" strokeLinecap="round" />
          <path d="M16 90 52 58l32 36 32-40 28 28 24-18" stroke={CORAL} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
        </>
      );
    case 'plate3':
      return (
        <>
          <path d="M60 60 60 16A44 44 0 0 0 60 104Z" fill={GREEN} stroke={emphasis === 'green' ? FOREST : 'none'} strokeWidth={emphasis === 'green' ? 5 : 0} />
          <path d="M60 60 60 16A44 44 0 0 1 104 60Z" fill={AMBER} stroke={emphasis === 'amber' ? FOREST : 'none'} strokeWidth={emphasis === 'amber' ? 5 : 0} />
          <path d="M60 60 104 60A44 44 0 0 1 60 104Z" fill={CORAL} stroke={emphasis === 'coral' ? FOREST : 'none'} strokeWidth={emphasis === 'coral' ? 5 : 0} />
          <circle cx="60" cy="60" r="8" fill={FOREST} />
        </>
      );
    case 'hands':
      return (
        <>
          <path d="M18 86c18-40 46-48 62-22" stroke={CORAL} strokeWidth="16" strokeLinecap="round" />
          <path d="M182 86c-18-40-46-48-62-22" stroke={CORAL} strokeWidth="16" strokeLinecap="round" />
          <path d="M64 70h72c0 20-16 32-36 32S64 90 64 70Z" fill={MINT} stroke={FOREST} strokeWidth="4" />
          <path d="M78 70h44" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'target':
      return (
        <>
          <circle cx="60" cy="60" r="48" fill={MINT} />
          <circle cx="60" cy="60" r="32" fill={AMBER} />
          <circle cx="60" cy="60" r="16" fill={CORAL} />
          <circle cx="60" cy="60" r="6" fill={FOREST} />
        </>
      );
    case 'check':
      return (
        <>
          <circle cx="60" cy="60" r="48" fill={GREEN} />
          <path d="M34 62 50 80 88 40" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'trophy':
      return (
        <>
          <path d="M38 24h44v30a22 22 0 0 1-44 0V24Z" fill={AMBER} stroke={FOREST} strokeWidth="4" />
          <path d="M38 34H24a18 18 0 0 0 18 22M82 34h14a18 18 0 0 1-18 22" stroke={FOREST} strokeWidth="4" />
          <rect x="52" y="76" width="16" height="16" fill={FOREST} />
          <rect x="38" y="92" width="44" height="10" rx="3" fill={FOREST} />
        </>
      );
    case 'path':
      return (
        <>
          <path d="M10 36c28 0 36 4 52 36 16 32 28 36 48 20 18-14 36-28 80-24" stroke={FOREST} strokeWidth="6" strokeLinecap="round" />
          <circle cx="10" cy="36" r="7" fill={AMBER} />
          <circle cx="186" cy="68" r="8" fill={CORAL} />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="60" cy="60" r="46" fill={MINT} stroke={FOREST} strokeWidth="6" />
          <path d="M60 60V32M60 60l20 14" stroke={FOREST} strokeWidth="6" strokeLinecap="round" />
          <circle cx="60" cy="60" r="5" fill={CORAL} />
        </>
      );
    default:
      return null;
  }
}
