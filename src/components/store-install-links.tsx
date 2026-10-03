import { orderedStoreLinks, phoneStoreFromUserAgent } from '@/lib/store-links';

const primaryClass = 'rounded-full bg-forest px-5 py-3 font-extrabold text-white';
const secondaryClass = 'rounded-full border border-border-brand px-5 py-3 font-extrabold text-forest';

export function StoreInstallLinks({ userAgent }: { userAgent: string | null }) {
  return (
    <>
      {orderedStoreLinks(phoneStoreFromUserAgent(userAgent)).map((store) => (
        <a
          key={store.label}
          href={store.href}
          className={store.primary ? primaryClass : secondaryClass}
        >
          {store.label}
        </a>
      ))}
    </>
  );
}
