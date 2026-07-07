'use client';

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-teal-brand px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-brand disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
