# Nutree AI onboarding progress: current implementation

Inspection date: 2026-08-08. Read-only inspection of `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai`; no Flutter files were changed and tests were not run.

## Bottom line

Onboarding is one GoRouter route, `/onboarding`, rendering a non-swipeable `PageView` of dynamically filtered screen/transition entries. Progress is not currently shown as one global live bar: the active flow uses six animated section dots on interstitial transition screens. A reusable full-width `OnboardingProgressBar` exists and has unit coverage, but `rg` found no production reference to it.

Progress persistence has two layers:

1. Answers and milestone flags are serialized as `OnboardingData` JSON in `SharedPreferences` under `onboarding_data_v3`.
2. The last concrete screen ID is separately cached under `onboarding_current_screen`; transition pages are not cached.

On relaunch, the cached screen is accepted only if it is not ahead of the data-derived resume point. Otherwise, resume is derived from missing answers and flags.

## Exact files and routing

- `lib/core/constants/app_constants.dart:51-58` — defines `AppConstants.onboardingRoute == '/onboarding'`.
- `lib/features/onboarding/presentation/router/onboarding_routes.dart:5-9` — maps `/onboarding` to `OnboardingFlowScreen`.
- `lib/features/auth/presentation/router/app_router_config.dart:23-35` — registers onboarding after welcome/email-link routes and before subscriptions/AI Handshake routes.
- `lib/features/onboarding/presentation/screens/onboarding_flow_screen.dart:77-168` — watches the controller, builds the `PageView`, disables swipe, renders transitions through `TransitionScreen`, and resolves screens through the registry.
- `lib/features/onboarding/presentation/screens/onboarding_screen_registry.dart:34-80` — exhaustive `OnboardingScreenId` to widget mapping.
- `lib/features/onboarding/domain/models/onboarding_flow_entry.dart:3-17` — an entry is either a concrete screen ID or a transition key; transitions have no screen ID.

There are no per-question routes. `PageController` state is the in-flow navigation state.

## Enum order versus actual execution order

`lib/features/onboarding/domain/enums/onboarding_screen_id.dart:3-43` declares this enum order:

`nameAsk`, `goal`, `targetWeight`, `challenges`, `referralSource`, `duration`, `reflection`, `sex`, `age`, `heightWeight`, `bodyFat`, `targetBodyFat`, `trainingDays`, `trainingDuration`, `experience`, `trainingType`, `activityLevel`, `diet`, `tdeeSciencePromo`, `smartMacroPromo`, `smartMealsPromo`, `fullTrialExperiencePromo`, `calculating`, `tdeeTargets`, `resultPromising`, `healthConnect`, `authTransition`, `notificationAsk`, `preAttExplainer`.

That enum order is explicitly documented as default order, not runtime order. Runtime order comes from `OnboardingSection.values` and each section's `screens` list in `lib/features/onboarding/domain/enums/onboarding_section.dart:4-68`, assembled by `lib/features/onboarding/presentation/providers/onboarding_flow_provider.dart:88-109`:

```text
section_intro
  greetings:    nameAsk -> goal -> challenges -> duration -> reflection -> referralSource
section_1_to_2
  personalInfo: sex -> age -> heightWeight -> targetWeight -> bodyFat -> targetBodyFat
section_2_to_3
  training:     trainingDays -> trainingDuration -> experience -> trainingType
section_3_to_4
  dailyLife:    activityLevel -> diet
section_4_to_5
  results:      calculating -> tdeeTargets -> resultPromising -> authTransition
section_5_to_6
  featurePromo: healthConnect -> smartMacroPromo -> tdeeSciencePromo -> smartMealsPromo -> fullTrialExperiencePromo
  completion:   notificationAsk -> preAttExplainer
```

The bundled default screen keys are in `lib/features/onboarding/data/models/onboarding_flow_defaults.dart:14-347`; `targetBodyFat` is the deliberate exception: it is absent from the map but is hardcoded as a locked screen. `OnboardingContentResolver.isScreenVisible` (`lib/features/onboarding/domain/services/onboarding_content_resolver.dart:81-109`) filters by config, keeps locked screens visible, and hides unknown screens. The config provider is currently bundled defaults (`lib/features/onboarding/application/providers/onboarding_flow_config_provider.dart:7-10`), so order is hardcoded; config controls visibility/content rather than reordering.

Runtime skips in `lib/features/onboarding/presentation/providers/onboarding_flow_provider.dart:286-347` remove or bypass:

- `targetWeight` for `goal == 'recomp'`;
- `targetBodyFat` unless the goal is recomp with a current visual body-fat range;
- training duration/experience/type when there are no planned training days;
- `nameAsk` for an Apple-provider user who has no name and skipped name collection;
- `authTransition` for an already authenticated user;
- `preAttExplainer` on Android or after ATT was already shown;
- `healthConnect` when Apple Health is unavailable or already handled.

`nextPage()` walks forward over skipped entries and applies side effects such as saving the current weight for recomp or marking skipped name/auth steps (`...onboarding_flow_provider.dart:216-249,349-379`).

## Progress calculation

The intended question-only calculation is in `lib/features/onboarding/presentation/providers/onboarding_flow_provider.dart:49-66`:

- `inputScreenCount`: count visible entries where `isScreen` is true and `_shouldSkipScreen(index)` is false.
- `currentInputIndex`: count those same eligible input screens strictly before the current `PageView` state.
- Transitions do not count.
- Skipped questions do not count.

The reusable bar in `lib/features/onboarding/presentation/widgets/onboarding_progress_bar.dart:4-45` calculates:

`progress = clamp((currentIndex + 1) / totalSteps, 0.0, 1.0)`; zero/negative totals produce `0.0`.

It animates the value with `TweenAnimationBuilder`, 300 ms, `Curves.easeInOut`, and exposes a percentage semantics value. Its test (`test/features/onboarding/presentation/widgets/onboarding_progress_bar_test.dart:22-52`) verifies 3/4 → 0.75 and clamping. It is currently orphaned from the live flow; the only source references are the widget and its test.

The active progress UI is `SectionProgressDots` in `lib/features/onboarding/presentation/widgets/transition_decorations.dart:104-141`, used by `TransitionScreen` (`.../transition_screen.dart:227-249`). `TransitionScreen` maps `section_intro` to section 1/dot 0 and parses `section_N_to_M` into dot index `M - 1` (`.../transition_screen.dart:35-46`). It always renders `total: 6`, corresponding to intro plus the five section transitions.

## Persistence and resume behavior

- `lib/core/constants/cache_keys.dart:14-18` defines `onboarding_data_v3`, completion keys, and `onboarding_current_screen`.
- `lib/features/onboarding/application/providers/onboarding_notifier.dart:24-112` loads the JSON snapshot synchronously from `SharedPreferences`, normalizes it, and falls back to legacy v2 data. The empty-state fallback has fresh timestamps.
- `.../onboarding_notifier.dart:130-283` merges a step's fields/flags into `OnboardingData`, calls `_saveToLocal()` (`:347-357`), and then tracks the step. Individual screen files call `updateStep`; notable milestone writers are:
  - `lib/features/onboarding/presentation/screens/tdee_targets_screen.dart:580-595` → `hasViewedTdee: true`;
  - `lib/features/onboarding/presentation/screens/auth_transition_screen.dart:55-60` → `hasViewedAuthTransition: true`;
  - `lib/features/onboarding/presentation/screens/onboarding_health_connect_screen.dart:177-181` → `hasViewedHealthConnect: true`.
- `lib/features/onboarding/domain/entities/onboarding_data.dart:74-100` defines persisted answer fields and progress flags. `resumeScreenId` (`:153-208`) derives the first missing step in full-flow order; after required answers it returns `calculating` until `hasViewedTdee`, then `authTransition` until `hasViewedAuthTransition`, then `null`. Notification is intentionally not part of the data-derived resume state.
- `lib/features/onboarding/presentation/providers/onboarding_flow_provider.dart:119-181` combines resume sources:
  - fresh/no name → page 0;
  - iOS after auth but before Health → Health page;
  - otherwise `OnboardingData.resumeScreenId`;
  - a cached screen is rejected if invalid or ahead of the data-derived index.
- `.../onboarding_flow_provider.dart:183-192,267-283` writes the concrete screen name on every `_goTo` via an unawaited `SharedPreferences.setString`; transitions leave the previous concrete screen cached. One-step moves use a 300 ms `PageController.animateToPage` with `easeInOut`; jumps use `jumpToPage`.
- Completion in `lib/features/onboarding/application/providers/onboarding_notifier.dart:524-589` calls the backend completion repository, sets local completion, writes completion booleans, and removes the answer snapshot, current screen, replay marker, and cached TDEE results. `clear()` (`:610-627`) removes the same local draft state.
- Backend persistence is separate: `syncToBackend()` (`.../onboarding_notifier.dart:359-463`) saves the completed profile through `onboardingProfileRepository`; it is not the progress-indicator state.

The provider tests in `test/features/onboarding/presentation/providers/onboarding_flow_provider_test.dart:57-184,605-804` cover screen-cache persistence, rejecting an ahead/invalid cache, auth/Health resume, and handled Health traversal. The data tests in `test/features/onboarding/unit/onboarding_data_test.dart:330-449` cover field-derived resume order.

## Animation and loading patterns to adapt conceptually

- **Section interstitials:** `TransitionScreen` uses one 900 ms controller, with fade/slide intervals around 10–70% and an accent-line draw around 0–60% (`.../transition_screen.dart:28-75`). The six dots morph over 300 ms via `AnimatedContainer`; the whole screen advances on tap.
- **Calculation/loading screen:** `CalculatingScreen` (`.../calculating_screen.dart:16-122`) runs a 12-second controller with a deliberate slow-finish curve, triggers haptics at 25/45/65/85%, invalidates and prefetches TDEE after the first frame, and advances only when both animation and preview work are finished. Preview failure is caught and treated as ready for the next screen. It prevents back navigation with `PopScope(canPop: false)`.
- **Calculation visual feedback:** `.../calculating_screen.dart:153-225,239-375` uses an animated percentage/linear bar, three stage labels switched with 400 ms fades, a four-item macro checklist whose checks appear at the same thresholds, and a testimonial carousel rotating every 3 seconds. Checklist icons use 300 ms scale transitions.
- **Generic CTA state:** `OnboardingContentLayout` (`.../onboarding_content_layout.dart:223-341`) pins the CTA, disables it while `_loading`, shows a 2 px white `CircularProgressIndicator`, awaits validation/save, prevents double navigation, and resets loading in `finally`. It catches errors into the app logger plus a generic snackbar.
- **Result reveal:** `ResultPromisingScreen` (`.../result_promising_screen.dart:215-254`) delays 300 ms, then runs a 2-second controller: chart fade 0–40%, disclaimer fade 75–100%; reduced-motion users receive static content.
- **Flow navigation:** `OnboardingFlowScreen` prevents swipe, hides back during calculation, and uses a 350 ms guard against repeated back taps (`.../onboarding_flow_screen.dart:29-43,106-115`).

For the web funnel, the most portable pattern is: count only eligible question steps for a percentage, keep interstitials out of that denominator, persist answers plus an explicit current-step ID, validate cached step against the answers before resuming, and gate a calculation screen on both a minimum visual dwell/animation and the real async result. The six-dot section model is a separate narrative-progress treatment, not a substitute for question completion percentage.

## Caveat

`test/features/onboarding/presentation/screens/onboarding_flow_screen_test.dart:19-31` contains an old helper describing an 8/9-step authenticated flow. It does not reflect the current provider-driven `PageView`/section-entry implementation and should not be used as the source of truth for route order or current progress totals.

**Status:** DONE
**Summary:** Traced current onboarding routing, enum/section order, dynamic skip rules, progress calculations, local/backend persistence, resume validation, and animation/loading patterns. Saved this report without modifying the Flutter repo.
**Concerns/Blockers:** The full-width progress bar and its provider getters appear intended but are not wired into the live onboarding screen; current live progress is section dots only.
