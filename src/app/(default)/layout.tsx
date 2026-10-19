import { metaPixelId } from '@/lib/analytics/meta-identity';
import { rootMetadata } from '@/lib/funnel/survey-metadata';
import { RootDocument } from '../root-document';
import '../globals.css';

export const metadata = rootMetadata('vi');

/** Vietnamese document for every route except /survey/[language]. Static: no request headers. */
export default function DefaultLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RootDocument locale="vi" pixelId={metaPixelId()}>
      {children}
    </RootDocument>
  );
}
