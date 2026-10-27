'use client';

import { useEffect, useRef } from 'react';

/**
 * The phone's Back button runs the visible screen's own back action instead of leaving the funnel.
 * Screens change without changing the URL, so while a screen has a back action one extra history
 * entry for the same URL sits on top: Back pops it, the action runs, and the entry goes back on top.
 */

const GUARD_KEY = 'nutreeBack';

type Registration = { priority: number; order: number; run: () => void };

const registrations = new Set<Registration>();
let nextOrder = 0;
let listening = false;

function guardOnTop(): boolean {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && GUARD_KEY in state;
}

function pushGuard(): void {
  if (!guardOnTop()) window.history.pushState({ [GUARD_KEY]: true }, '');
}

/** The registration that owns Back now: the highest priority, then the newest. */
function activeRegistration(): Registration | undefined {
  let active: Registration | undefined;
  for (const registration of registrations) {
    if (!active || registration.priority > active.priority || (registration.priority === active.priority && registration.order > active.order)) {
      active = registration;
    }
  }
  return active;
}

function handlePopState(): void {
  // Forward back onto the guard: nothing to undo.
  if (guardOnTop()) return;
  const active = activeRegistration();
  if (!active) {
    // The guard outlived the screen that placed it (the first question has no back action): leave, as Back would have.
    window.history.back();
    return;
  }
  active.run();
  pushGuard();
}

/**
 * Runs `onBack` when the phone's Back button is pressed while this screen is shown; null leaves Back to the
 * browser. A higher priority wins, so a sheet open over its page closes before the page goes back.
 */
export function useBrowserBack(onBack: (() => void) | null, priority = 0): void {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });
  const enabled = onBack != null;
  useEffect(() => {
    if (!enabled) return;
    if (!listening) {
      window.addEventListener('popstate', handlePopState);
      listening = true;
    }
    const registration: Registration = { priority, order: nextOrder++, run: () => latest.current?.() };
    registrations.add(registration);
    pushGuard();
    return () => {
      registrations.delete(registration);
    };
  }, [enabled, priority]);
}
