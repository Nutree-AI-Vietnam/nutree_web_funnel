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
      className={`w-full rounded-2xl border-2 px-5 py-4 text-left text-base font-medium transition ${
        selected
          ? 'border-teal-brand bg-mist text-forest'
          : 'border-border-brand bg-white text-charcoal hover:border-teal-brand/50'
      }`}
    >
      {label}
    </button>
  );
}
