'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { getAttribution } from '@/lib/analytics/attribution';
import { funnelLocaleFromPath, funnelName } from '@/lib/analytics/funnel-locale';
import { captureFunnelEvent } from '@/lib/analytics/posthog';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import type { QuizStep } from '@/lib/quiz/steps';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { QuizStepFrame } from './quiz-step-frame';

/**
 * Choices the browser recorded before this component's listeners existed.
 * Kept outside the instance so a hydration replay can still see them.
 */
const pendingChoices = new Map<string, string>();
const snapshottedFields = new Set<string>();

/** Drops a remembered tap. Tests start from an empty document. */
export function clearPreHydrationChoices(): void {
  pendingChoices.clear();
  snapshottedFields.clear();
}

/** Option the browser already selected inside this step's server HTML. */
function readPreHydrationChoice(field: string): string | null {
  if (typeof document === 'undefined') return null;
  const roots = document.querySelectorAll<HTMLElement>('[data-choice-field]');
  for (const root of roots) {
    if (root.getAttribute('data-choice-field') !== field) continue;
    for (const radio of root.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      if (radio.checked && radio.value) return radio.value;
    }
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !root.contains(active)) continue;
    if (active.dataset.choice) return active.dataset.choice;
    if (active instanceof HTMLInputElement && active.value) return active.value;
  }
  return null;
}

function rememberPreHydrationChoice(field: string, step: QuizStep): void {
  // A restored later step only painted the goal screen. Don't carry that tap forward.
  if (useQuizStore.getState().currentStep !== step) {
    pendingChoices.delete(field);
    snapshottedFields.delete(field);
    return;
  }
  if (snapshottedFields.has(field)) return;
  if (typeof document === 'undefined') return;
  const roots = document.querySelectorAll('[data-choice-field]');
  const hasRoot = Array.from(roots).some((node) => node.getAttribute('data-choice-field') === field);
  // The server render has no document body yet. Snapshot once the server HTML is actually there.
  if (!hasRoot) return;
  snapshottedFields.add(field);
  const choice = readPreHydrationChoice(field);
  if (choice) pendingChoices.set(field, choice);
}

export function SingleChoiceStep<K extends keyof OnboardingPayload>({
  step,
  field,
  question,
  description,
  options,
}: {
  step: QuizStep;
  field: K;
  question: string;
  description?: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string; readonly icon?: string }>;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const stored = useQuizStore((s) => s.data[field]);
  // Saved answers are tab-only. Ignore them until hydration so the server HTML matches.
  const value = hydrated ? stored : undefined;
  const setData = useQuizStore((s) => s.setData);
  // Show the selection, then advance so feedback lands before navigation.
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chosenRef = useRef(false);
  const readyRef = useRef(false);
  const fieldName = String(field);

  rememberPreHydrationChoice(fieldName, step);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = useCallback((key: string) => {
    if (chosenRef.current) return;
    chosenRef.current = true;
    setData({ [field]: key } as Partial<OnboardingPayload>);
    setPending(key);
    if (step === 'goal') {
      const locale = funnelLocaleFromPath(window.location.pathname);
      captureFunnelEvent('goal_option_selected', {
        ...getAttribution(),
        option: key,
        locale,
        step,
        funnel_locale: locale,
        funnel: funnelName(locale),
        source: 'web_funnel',
      });
    }
    timerRef.current = setTimeout(() => goToNextQuizStep(router, step), 240);
  }, [field, router, setData, step]);

  const onSelect = (key: string) => {
    if (!readyRef.current) {
      pendingChoices.set(fieldName, key);
      return;
    }
    choose(key);
  };

  useEffect(() => {
    // Wait until the tab state is restored. Landing reset runs in a layout effect before this.
    if (!hydrated) return;
    readyRef.current = true;
    const key = pendingChoices.get(fieldName);
    pendingChoices.delete(fieldName);
    if (!key || useQuizStore.getState().currentStep !== step) return;
    choose(key);
  }, [choose, fieldName, hydrated, step]);

  return (
    <QuizStepFrame title={question} description={description} className="gap-3">
      <form
        data-choice-field={fieldName}
        autoComplete="off"
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          const selected = event.currentTarget.querySelector<HTMLInputElement>('input[type="radio"]:checked');
          if (selected?.value) onSelect(selected.value);
        }}
      >
        {options.map((o) => (
          <OptionCard
            key={o.key}
            label={o.label}
            icon={o.icon}
            selected={pending ? pending === o.key : value === o.key}
            choiceName={fieldName}
            choiceValue={o.key}
            onClick={() => onSelect(o.key)}
          />
        ))}
      </form>
    </QuizStepFrame>
  );
}
