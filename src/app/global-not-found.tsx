import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  description: 'Trang này không tồn tại.',
};

/** Full document for unmatched URLs. Multiple root layouts cannot share a 404. */
export default function GlobalNotFound() {
  return (
    <html lang="vi" className="h-full">
      <body className={`${beVietnam.variable} flex min-h-full flex-col font-sans antialiased`}>
        <main className="grid min-h-dvh place-items-center px-5 text-charcoal">
          <section className="mx-auto max-w-xl rounded-[2rem] border border-border-brand bg-white p-8 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)]">
            <p className="text-sm font-extrabold tracking-[0.02em] text-teal-brand">404</p>
            <h1 className="mt-4 text-[clamp(2rem,6vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.05em] text-forest">
              Không tìm thấy trang
            </h1>
            <p className="mt-3 text-lg font-semibold text-slate-brand">Page not found</p>
            <p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand">
              Đường dẫn này không tồn tại. Quay lại Nutree để tiếp tục.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-deep"
            >
              Về trang chủ
            </Link>
          </section>
        </main>
      </body>
    </html>
  );
}
