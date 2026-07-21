'use client';

export function OptionCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 text-left text-base font-semibold shadow-sm transition duration-150 focus:outline-none focus:ring-4 focus:ring-teal-brand/15 active:scale-[0.99] ${
        selected
          ? 'border-teal-brand bg-mist text-forest ring-2 ring-teal-brand/15'
          : 'border-border-brand bg-white text-charcoal hover:border-teal-brand/50 hover:bg-mist/40'
      }`}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm transition ${
          selected ? 'border-teal-brand bg-teal-brand text-white' : 'border-border-brand text-transparent'
        }`}
      >
        ✓
      </span>
    </button>
  );
}
