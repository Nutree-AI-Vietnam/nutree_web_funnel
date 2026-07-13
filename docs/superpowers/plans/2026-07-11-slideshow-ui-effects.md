# Slideshow And UI Effects Implementation Plan

Goal: improve the Nutree web funnel presentation with a lightweight slideshow
and polished UI effects while preserving the current funnel logic, performance,
and accessibility.

Assumptions:

- Slideshow means a reusable, mobile-first carousel for educational/value-prop
  content in the funnel.
- UI effects means subtle transitions, progress movement, button feedback,
  selected-state animation, result-count animation, and paywall emphasis.
- Effects should be implemented with CSS and small React components first. Avoid
  adding animation libraries unless a specific interaction requires one.
- All effects must respect `prefers-reduced-motion`.

Important repo instruction:

- Before editing Next.js code, read the relevant local Next.js guide in
  `node_modules/next/dist/docs/` because this project uses Next.js `16.2.10`.

## Target Experience

The funnel should feel closer to a polished mobile onboarding flow:

- Landing page shows a compact slideshow of Nutree benefits/results.
- Promo/interstitial steps can reuse the same slideshow system when needed.
- Quiz step transitions are smooth but fast.
- Progress bar and option cards feel responsive.
- Paywall has clearer visual hierarchy and conversion emphasis.
- No effect should slow down quiz completion or create layout shift.

## Design Constraints

- Keep the existing brand palette in `src/app/globals.css`.
- Keep Vietnamese copy centralized in `src/lib/copy/vi.ts`.
- Keep components mobile-first with `max-w-lg`.
- Do not add decorative background blobs/orbs.
- Avoid autoplay-only behavior; users must be able to manually change slides.
- Use semantic buttons for slide controls.
- Pause slideshow autoplay while the user interacts.
- Disable or simplify motion for `prefers-reduced-motion: reduce`.

## Task 1: Read Required Framework Docs

Files:

- Read only: `node_modules/next/dist/docs/`

Steps:

- [x] Find the relevant App Router/client component docs for this Next.js
  version.
- [x] Confirm whether any new client components or route behavior require
  updated conventions.
- [x] Note any relevant deprecations before editing.

## Task 2: Add Slideshow Copy

Files:

- Modify: `src/lib/copy/vi.ts`

Steps:

- [x] Add `landing.slides` with 3-4 concise Vietnamese slides.
- [x] Each slide should include:
  - `title`
  - `body`
  - `metric` or short visual label
- [x] Keep copy specific to Nutree:
  - personalized calories/macros
  - AI meal suggestions
  - progress adjustment
  - app handoff after checkout
- [x] Avoid generic marketing claims that cannot be supported.

Example structure:

```ts
slides: [
  {
    title: 'Macro cá nhân hóa',
    body: 'Tính mục tiêu calo, protein, carb và fat dựa trên dữ liệu của bạn.',
    metric: '4 chỉ số',
  },
]
```

## Task 3: Create Reusable Slideshow Component

Files:

- Create: `src/components/slideshow.tsx`
- Optional tests: `src/components/slideshow.test.tsx` only if a component test
  setup already exists or is added deliberately.

Behavior:

- [x] Client component.
- [x] Accepts slide array, optional autoplay interval, and optional initial index.
- [x] Renders:
  - active slide content
  - previous/next controls
  - dot indicators
  - accessible labels
- [x] Supports keyboard navigation:
  - Left arrow: previous
  - Right arrow: next
- [x] Autoplay:
  - enabled by default on landing
  - pauses on hover/focus/pointer interaction
  - disabled when `prefers-reduced-motion` is active
- [x] Avoids layout shift by using stable container height or grid overlay.

Implementation preference:

- Use React state + `useEffect`.
- Use CSS transitions through Tailwind classes and global keyframes only where
  needed.
- Do not introduce Swiper/Framer Motion for this first pass.

## Task 4: Add Motion Utilities

Files:

- Modify: `src/app/globals.css`

Steps:

- [x] Add small keyframes/classes for:
  - fade/translate in
  - progress shimmer or fill transition
  - selected-card press feedback
- [x] Add a `prefers-reduced-motion` block that disables animations and long
  transitions.
- [x] Keep durations short:
  - 120-180ms for press/hover feedback
  - 220-320ms for slide transitions
  - avoid anything above 500ms in the quiz path

Expected additions:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Task 5: Update Landing Page

Files:

- Modify: `src/app/page.tsx`
- Use: `src/components/slideshow.tsx`

Steps:

- [x] Place slideshow between subheadline and CTA, or after CTA if it improves
  scan speed.
- [x] Keep first viewport focused on starting the quiz.
- [x] Ensure CTA remains visible without excessive scrolling on common mobile
  heights.
- [x] Keep existing analytics event `landing`.
- [x] Verify no text overflows on narrow mobile widths.

## Task 6: Improve Quiz Shell Transitions

Files:

- Modify: `src/components/quiz-shell.tsx`

Steps:

- [x] Add a lightweight enter transition for step content keyed by `step`.
- [x] Improve progress bar transition timing.
- [x] Keep hydration gate behavior unchanged.
- [x] Keep back button behavior unchanged.
- [x] Ensure route changes do not leave stale visual states.

Implementation note:

- Because route changes remount `StepRenderer`, use a keyed wrapper such as:

```tsx
<div key={step} className="...">{children}</div>
```

## Task 7: Improve Option/Button Feedback

Files:

- Modify: `src/components/option-card.tsx`
- Modify: `src/components/primary-button.tsx`
- Check step components using custom buttons:
  - `src/components/steps/training-days.tsx`
  - `src/components/steps/height-weight.tsx`
  - `src/components/steps/tdee-targets.tsx`

Steps:

- [x] Add selected-state emphasis that is visible but not distracting.
- [x] Add active press scale or background transition.
- [x] Ensure disabled button states remain clear.
- [x] Ensure hover styles do not become the only selected-state indicator.
- [x] Validate tap targets remain at least 44px tall.

## Task 8: Upgrade Promo/Interstitial Screens

Files:

- Modify: `src/components/steps/promo.tsx`
- Optional: create `src/components/metric-card.tsx`

Steps:

- [x] Replace large emoji-only presentation with a more structured visual
  treatment.
- [x] Add subtle enter effect for headline/body.
- [x] Consider using slideshow for multi-point promo content if copy supports it.
- [x] Preserve current continue flow and `nextRoute(step)`.

## Task 9: Polish Results And Paywall

Files:

- Modify: `src/components/steps/tdee-targets.tsx`
- Modify: `src/app/paywall/page.tsx`

Steps:

- [x] Add count-up or staged reveal for TDEE/macros only if it does not obscure
  actual values.
- [x] Add stronger paywall plan emphasis:
  - selected package affordance
  - “recommended” marker for annual package if annual exists
  - stable package card dimensions
- [x] Keep RevenueCat package rendering dynamic.
- [x] Do not fire purchase pixels from the client.

## Task 10: Add Visual QA Checklist

Files:

- Create: `docs/superpowers/plans/2026-07-11-slideshow-ui-effects-qa.md`
  or append to this plan after implementation.

Check:

- [ ] iPhone-sized viewport: 390x844
- [ ] Small Android-sized viewport: 360x740
- [ ] Desktop narrow: 480x900
- [ ] Desktop standard: 1280x800
- [ ] `prefers-reduced-motion`
- [ ] Keyboard navigation on slideshow
- [ ] No overlapping text
- [ ] No layout jumps when slides change
- [ ] Paywall still works when RevenueCat packages fail to load

## Task 11: Verification

Commands:

```bash
npm test
npm run build
npm run test:e2e
```

Manual smoke:

- [x] Landing slideshow cycles and controls work.
- [x] Quiz remains fast to complete.
- [x] Back navigation works after transitions.
- [x] Results screen values remain correct.
- [x] Email capture still reaches `/paywall`.
- [x] Paywall still handles missing RevenueCat key with error state.

## Task 12: Deploy

Steps:

- [ ] Deploy preview first:

```bash
vercel
```

- [ ] Smoke test preview URL.
- [ ] Deploy production only after visual QA:

```bash
vercel --prod
```

## Out Of Scope

- Rewriting the entire visual design system.
- Adding 3D scenes or heavy animation frameworks.
- Changing backend/payment contracts.
- Changing quiz question order or payload fields.
- Building a new RevenueCat paywall workflow in the dashboard.
