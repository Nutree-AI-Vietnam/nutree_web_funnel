'use client';

import { useLayoutEffect } from 'react';

export function ClearFragmentBeforeRender({ path = '/open-nutree' }: { path?: string }) {
  useLayoutEffect(() => {
    if (window.location.hash) window.history.replaceState({}, document.title, path);
  }, [path]);
  return null;
}
