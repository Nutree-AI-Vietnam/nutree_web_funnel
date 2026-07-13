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
      className={`min-h-12 w-full rounded-2xl border-2 px-5 py-4 text-left text-base font-medium shadow-sm transition duration-150 active:scale-[0.99] ${
        selected
          ? 'border-teal-brand bg-mist text-forest ring-2 ring-teal-brand/15'
          : 'border-border-brand bg-white text-charcoal hover:border-teal-brand/50 hover:bg-mist/40'
      }`}
    >
      {label}
    </button>
  );
}
