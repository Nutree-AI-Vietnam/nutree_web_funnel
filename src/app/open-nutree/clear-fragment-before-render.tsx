'use client';

import { useLayoutEffect } from 'react';

export function ClearFragmentBeforeRender() {
  useLayoutEffect(() => {
    if (window.location.hash) window.history.replaceState({}, document.title, '/open-nutree');
  }, []);
  return null;
}
