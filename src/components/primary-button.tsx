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
      className="min-h-12 w-full rounded-2xl bg-teal-brand px-6 py-4 text-lg font-semibold text-white shadow-sm transition duration-150 hover:bg-emerald-brand active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}
