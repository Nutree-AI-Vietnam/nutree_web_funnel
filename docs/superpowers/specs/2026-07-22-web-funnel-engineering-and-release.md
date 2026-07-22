# Nutree Web Funnel — Engineering, Payment, Analytics, and Release Specification

**Date:** 2026-07-22  
**Status:** Final implementation direction  
**Scope:** Web, backend, MoMo, Airbridge/deep link, mobile claim, analytics, QA  
**Experimentation:** None

---

## 1. Architecture decision

Retain the shared Nutree onboarding schema and web-to-app claim concept, but implement a dedicated web step configuration.

```text
Shared data model
├── Web step config: motivation + core calculation + ownership + payment
├── Mobile step config: full product setup
└── Post-purchase app config: remaining preferences + first action
```

Do not fork two unrelated data models.

The web application remains Next.js + TypeScript. Payment secrets and authoritative purchase state remain on the backend.

---

## 2. Route configuration

Replace the current one-for-one mobile route list with the fixed web route list:

```ts
export const WEB_FUNNEL_STEPS = [
  'goal',
  'name_ask',
  'challenges',
  'duration',
  'motivation',
  'reflection',
  'body_basics',
  'body_metrics',
  'target_weight',
  'body_review',
  'routine',
  'eating_pattern',
  'diet',
  'support_style',
  'plan_summary',
  'calculating',
  'result',
] as const;
```

Keep page routes after the quiz:

```text
/email
/paywall
/momo/return
/success
```

### Step metadata

Each step should declare:

```ts
type WebStepDefinition = {
  slug: WebFunnelStep;
  chapter: 'goal' | 'body' | 'routine' | 'plan';
  requiredFields: Array<keyof OnboardingPayload>;
  optionalFields?: Array<keyof OnboardingPayload>;
  canAutoAdvance: boolean;
  analyticsName: string;
};
```

Use this definition for:

- Validation.
- Progress.
- Back/next routing.
- Resume routing.
- Analytics.
- Required-field guard.

Do not maintain separate hardcoded progress logic in components.

---

## 3. Data model

### Shared payload

Retain existing fields:

```ts
interface OnboardingPayload {
  name?: string;
  fitness_goal?: 'cut' | 'bulk' | 'recomp' | 'maintain';
  target_weight_kg?: number;
  pain_points?: string[];
  challenge_duration?: string;
  gender?: 'male' | 'female';
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  training_days_per_week?: number;
  training_minutes_per_session?: number;
  job_type?: 'desk' | 'on_feet' | 'physical';
  dietary_preferences?: string[];
  measurement_unit?: 'metric';
}
```

Add:

```ts
type Motivation =
  | 'confidence'
  | 'energy'
  | 'health'
  | 'clothes'
  | 'training'
  | 'clarity';

type HardestEatingMoment =
  | 'morning'
  | 'lunch'
  | 'evening'
  | 'late_night'
  | 'weekend'
  | 'eating_out';

type SupportStyle =
  | 'simple'
  | 'flexible'
  | 'detailed'
  | 'gentle';

interface OnboardingPayload {
  motivation?: Motivation;
  hardest_eating_moment?: HardestEatingMoment;
  support_style?: SupportStyle;
}
```

### Web-only attribution

Do not ask referral source in the UI.

Store separately:

```ts
interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_id?: string;
  adgroup_id?: string;
  ad_id?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  ttclid?: string;
  referrer?: string;
  landing_url?: string;
}
```

Do not pass body or nutrition answers to ad platforms.

---

## 4. State and privacy

### 4.1 Required model

The backend is the source of truth for the anonymous funnel session.

Recommended flow:

1. `POST /v1/web-funnel/sessions`
2. Backend returns/sets an opaque session identifier.
3. Prefer an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
4. The client keeps current UI state in memory.
5. Relevant answers are synced to the backend after completion of each step.
6. Resume uses the session cookie or a separate opaque recovery token.
7. Email attaches identity to the existing session.
8. Payment order attaches to the same session.
9. Claim token references the server-side session/profile.

### 4.2 Local storage

Do not persist the following indefinitely in `localStorage`:

- Email.
- Full onboarding payload.
- Body measurements.
- Dietary preferences.
- Claim token.
- Web user ID.
- Payment order ID.
- Purchased flag.

If local persistence is temporarily retained during migration:

- Use `partialize`.
- Store only a random session/resume token and current step.
- Add an expiration.
- Clear after app claim or explicit reset.
- Never store claim token.
- Never treat `purchased=true` in browser storage as authoritative.

### 4.3 Consent record

Store:

- Consent version.
- Timestamp.
- Funnel version.
- Locale.
- Source.
- Privacy/terms versions.
- Advertising consent separately from service processing.

The paid funnel is 18+.

---

## 5. Input validation

### 5.1 No accepted defaults

Every metric field has:

```ts
{
  value: number | null;
  interacted: boolean;
  confirmed: boolean;
}
```

Continue is enabled only when:

- A valid value exists.
- The user interacted or explicitly confirmed.
- Server-compatible validation passes.

Do not initialize `value` to a generic accepted value. A picker may visually center on an example, but it must remain unconfirmed.

### 5.2 Server validation

Validate:

- Age range and 18+ eligibility.
- Height range.
- Weight range.
- Target plausibility.
- Required goal.
- Required activity.
- Training ranges.
- Exclusive `none` diet option.
- Maximum challenge count.
- Maximum diet-option count.
- String lengths and normalized Unicode.
- Email syntax and normalization.

Return field-level errors.

### 5.3 Review confirmation

`body_review_confirmed_at` should be recorded after the user confirms the body summary.

If a body field is edited later, invalidate the confirmation.

---

## 6. Calculation

### 6.1 Authoritative path

Use the backend TDEE preview as the authoritative calculation.

Request includes:

- Age.
- Biological sex.
- Height.
- Current weight.
- Goal.
- Daily activity.
- Training frequency.
- Average training duration.
- Optional body fat only if later supplied safely.
- Metric units.

### 6.2 Fallback

A local fallback may remain only if:

- It matches backend behavior for all supported inputs.
- It includes the same safety floors and goal constraints.
- It is covered by parity fixtures.
- The result source is logged.
- It never produces an aggressive or nonsensical target from missing data.

If parity cannot be maintained, show a retry state rather than a potentially misleading plan.

### 6.3 Macro visualization

Display macro proportions by calorie contribution:

```ts
proteinKcal = protein_g * 4;
carbKcal = carbs_g * 4;
fatKcal = fat_g * 9;
total = proteinKcal + carbKcal + fatKcal;
```

Do not size bars by raw gram sum.

### 6.4 Calculation UI

- Start request on mount.
- Minimum visible state: 600–1,200 ms.
- No forced four-second sequence.
- Prevent duplicate request in React Strict Mode.
- Cancel/ignore stale request on navigation.
- Log API/fallback/retry source.

---

## 7. Recommended backend contracts

Existing endpoint names may remain, but behavior must satisfy this contract.

### Create anonymous session

```http
POST /v1/web-funnel/sessions
```

Response:

```json
{
  "session_id": "wf_...",
  "resume_expires_at": "ISO-8601"
}
```

Prefer setting the session in a secure cookie rather than exposing it to application code.

### Update session

```http
PATCH /v1/web-funnel/sessions/current
Content-Type: application/json
```

Body:

```json
{
  "current_step": "body_metrics",
  "onboarding_patch": {
    "height_cm": 170,
    "weight_kg": 70
  },
  "consent_version": "2026-07-22"
}
```

### Preview TDEE

```http
POST /v1/tdee/preview
```

Response should include:

```json
{
  "bmr": 0,
  "tdee": 0,
  "goal": "cut",
  "macros": {
    "calories": 0,
    "protein_grams": 0,
    "carbs_grams": 0,
    "fat_grams": 0
  },
  "calculation_version": "..."
}
```

### Create/attach lead

```http
POST /v1/web-funnel/leads
```

Body:

```json
{
  "email": "user@example.com",
  "session_id": "server-derived-or-cookie"
}
```

Response:

```json
{
  "web_user_id": "wu_...",
  "masked_email": "u***@example.com"
}
```

Do not return a long-lived claim token before payment if it is not needed.

### Create MoMo subscription checkout

```http
POST /v1/web-funnel/momo/subscription-checkouts
```

Body:

```json
{
  "plan_id": "monthly_199000_vnd",
  "idempotency_key": "client-generated-or-server-step-key"
}
```

Response:

```json
{
  "order_id": "ord_...",
  "status": "created",
  "pay_url": "https://...",
  "deeplink": "momo://...",
  "qr_code_url": "https://...",
  "amount": 199000,
  "currency": "VND",
  "next_billing_date": "2026-08-22T..."
}
```

The backend derives `web_user_id` from the session. Do not trust a caller-supplied arbitrary user ID.

### Payment status

```http
GET /v1/web-funnel/payment-orders/:order_id/status
```

Response:

```json
{
  "order_id": "ord_...",
  "status": "pending",
  "paid": false,
  "amount": 199000,
  "currency": "VND",
  "updated_at": "ISO-8601"
}
```

### App claim

```http
POST /v1/web-funnel/claim
```

Body:

```json
{
  "claim_token": "single_use_short_lived_token"
}
```

Response:

```json
{
  "onboarding_payload": {},
  "purchase_status": "paid",
  "entitlement": "premium",
  "remaining_onboarding_steps": [
    "training_type",
    "meal_schedule",
    "notifications",
    "first_meal"
  ]
}
```

---

## 8. MoMo reliability

### 8.1 Idempotency

Checkout creation must be idempotent.

Requirements:

- A stable idempotency key for a given user/session and purchase attempt.
- Duplicate button presses return the existing active order.
- Backend prevents overlapping active subscription checkouts.
- The CTA disables immediately after the first valid click.
- Network retries do not create new orders.

### 8.2 Source of truth

The backend MoMo IPN/webhook is authoritative.

Validate:

- Signature.
- Partner/merchant.
- Order ID.
- Amount.
- Currency.
- Expected user/session.
- Event replay/idempotency.

The browser return only triggers a status check.

### 8.3 Status model

Use explicit states:

```ts
type PaymentStatus =
  | 'created'
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'refunded';
```

Do not display `pending` as failure.

### 8.4 Polling

- One request at a time.
- Start immediately on return.
- Poll every 2–3 seconds initially.
- Back off after 20–30 seconds.
- Stop after a defined deadline.
- Continue offering manual “Kiểm tra lại.”
- Do not create a new checkout while the current order is pending.
- Show transaction reference.
- Recover after refresh.

### 8.5 Device behavior

#### Mobile

1. Attempt `deeplink`.
2. Fall back to `pay_url`.
3. Show “Mở lại MoMo.”
4. Handle in-app browsers.

#### Desktop

1. Show QR using `qr_code_url`.
2. Keep status page open.
3. Poll safely.
4. Offer email recovery.

---

## 9. Claim and app handoff

### Claim token requirements

- Generated only for an eligible session/order.
- Short-lived.
- Single-use.
- Bound to paid order and user.
- Stored hashed at rest where practical.
- Never placed in analytics.
- Never persisted indefinitely in local storage.
- Rotatable/reissuable through email recovery.

### Success link

The deep link should carry a token or signed handoff code:

```text
nutree://claim?token=...
```

Use Airbridge/deferred deep link as the primary path and a universal/app link email as recovery.

### Mobile behavior

After claim:

1. Validate payment.
2. Restore onboarding payload.
3. Save profile.
4. Attach entitlement.
5. Mark web sections complete.
6. Show remaining post-purchase setup only.
7. Route to first useful action.
8. Emit `app_claim_completed`.

### Recovery

If deferred deep link fails:

- The email link reopens the claim.
- The app supports “Tôi đã thanh toán trên web.”
- The user can enter email or use a secure recovery flow.
- Restore purchase does not require repeating the web quiz.

---

## 10. Analytics

### 10.1 No experiment fields

Set:

```text
funnel_version = web_psychological_investment_2026_07_22
```

Do not implement:

- `variant_id`
- experiment assignment
- exposure events
- split routing

### 10.2 Event taxonomy

```text
landing_viewed
quiz_started
funnel_step_viewed
funnel_step_completed
funnel_validation_error
body_review_confirmed
plan_summary_confirmed
calculation_started
calculation_completed
result_viewed
result_edited
email_submitted
paywall_viewed
checkout_started
payment_status_viewed
purchase_confirmed_server
purchase_failed
purchase_cancelled
app_claim_started
app_claim_completed
first_meal_logged
subscription_renewed
subscription_cancelled
refund_confirmed
```

### 10.3 Event fields

Safe fields:

- `funnel_version`
- `step`
- `chapter`
- `source`
- `campaign_id`
- `device_type`
- `browser`
- `payment_provider`
- `plan_id`
- `currency`
- `value`
- `event_id`
- `calculation_source`
- coarse timing

Do not send:

- Name.
- Email.
- Age.
- Sex.
- Height.
- Weight.
- Target weight.
- Body fat.
- Dietary preference.
- Challenge details.
- Claim token.
- Full order ID to ad platforms.

### 10.4 Purchase event

- Fire server-side after verified MoMo confirmation.
- Use a stable event ID for deduplication.
- Do not fire purchase from the paywall click.
- Do not trust browser `purchased=true`.

---

## 11. Security

- Add CSP suitable for analytics/payment dependencies.
- Restrict `connect-src`, `script-src`, and `frame-src`.
- Validate backend CORS.
- Add rate limiting to session, lead, checkout, status, and claim endpoints.
- Sanitize all string input.
- Do not expose backend errors to the user.
- Protect against open redirect in MoMo/Airbridge URLs.
- Validate allowed hosts before `window.location.assign`.
- Do not build a download link from an untrusted arbitrary base URL.
- Rotate/expire claim tokens.
- Log security-relevant payment and claim events.
- Use HTTPS everywhere.
- No web secrets in `NEXT_PUBLIC_*`.

---

## 12. Performance

Targets:

- Landing LCP under 2.5 seconds on typical mobile 4G.
- Interaction response under 100 ms for choices.
- Route transition begins immediately.
- Result assets lazy-loaded before they are needed.
- Real screenshots optimized with Next Image.
- Avoid loading motion libraries for static pages if no longer required.
- Avoid global animated backgrounds.
- Analytics scripts should not block first interaction.
- Load payment-specific code only near checkout.

Removing beams, glow, and motion components should reduce JS/CSS work.

---

## 13. Accessibility requirements

- Full keyboard path through the funnel.
- Screen-reader labels for all controls.
- Focus moved to the new screen heading after navigation.
- Error summary and field errors.
- `aria-live` for calculation/payment status.
- Back button always available except during irreversible external navigation.
- Reduced motion.
- Numeric input alternative to wheel.
- No hidden input as the only semantic value control.
- All option cards use correct checkbox/radio semantics.
- Progress has a meaningful accessible label.

---

## 14. Testing

### Unit

- Step ordering and chapter progress.
- Required field guards.
- Challenge maximum two.
- `none` diet exclusivity.
- No accepted defaults.
- Body-review invalidation after edit.
- Reflection interpolation.
- Plan-summary interpolation.
- TDEE payload mapping.
- Fallback parity fixtures.
- Macro calorie proportions.
- Payment-status mapping.
- Claim-token link encoding.
- Analytics field redaction.

### Integration

- Anonymous session create/update/resume.
- Email attaches to existing session.
- Checkout idempotency.
- Pending order recovery.
- IPN before browser return.
- Browser return before IPN.
- Duplicate IPN.
- Expired/cancelled/failed order.
- Paid order after local storage clear.
- Success after refresh.
- Claim after app install.
- Claim replay rejected.
- Email recovery claim.

### E2E

1. Full successful mobile flow.
2. Full successful desktop QR flow.
3. Back/edit body data.
4. No-target-weight flow.
5. API failure and fallback/retry.
6. Payment pending for 30+ seconds.
7. Payment cancelled.
8. Payment expired.
9. Double-click checkout.
10. Facebook/TikTok/Zalo in-app browser behavior.
11. App claim without repeated questions.
12. First meal event after claim.
13. Analytics contain no sensitive data.
14. Consent denial for advertising still allows service use.
15. 320 px viewport.
16. Keyboard-only flow.
17. Reduced-motion flow.

---

## 15. Current code migration map

### `src/lib/quiz/steps.ts`

- Replace current web step list with `WEB_FUNNEL_STEPS`.
- Add chapter metadata.
- Add route guard based on required fields.
- Keep app-specific ordering outside this web repository.

### `src/components/steps/registry.tsx`

- Add grouped screens:
  - `body-basics`
  - `body-metrics`
  - `routine`
  - `eating-pattern`
  - `support-style`
  - `plan-summary`
  - `result`
- Remove standalone web promo screens.
- Remove generic result-promising screen.

### `src/lib/copy/vi.ts`

- Replace with the final copy document.
- Add typed option keys.
- Add dynamic templates.
- Add payment status copy.

### `src/components/quiz-shell.tsx`

- Show chapter name and step-within-chapter.
- Focus heading after navigation.
- Remove background beams.
- Use simple progress.

### `src/components/primary-button.tsx`

- Replace moving-border implementation with a solid button.

### `src/components/ui/*`

Delete or stop using:

- `background-beams.tsx`
- `glowing-card.tsx`
- `moving-border-button.tsx`

Create:

- `panel.tsx`
- `choice-card.tsx`
- `progress.tsx`
- `metric-input.tsx`
- `product-demo.tsx`
- `trust-strip.tsx`

### `src/components/steps/calculating.tsx`

- Remove AI orb and floating chips.
- Remove forced four-second delay.
- Render real, derived stages.

### `src/components/steps/tdee-targets.tsx`

- Rename/expand as result.
- Correct macro visualization.
- Add input explanation/edit link.
- Add personalized product demo.

### `src/app/email/page.tsx`

- Add explicit next-step price disclosure.
- Attach email to current server session.
- Remove sensitive state dependency.

### `src/app/paywall/page.tsx`

- Render server offer data.
- Show today’s charge, renewal, next date, no trial, management path.
- Use one plan.
- Use device-aware MoMo launch.
- Validate redirect host.

### `src/app/momo/return/page.tsx`

- Model explicit statuses.
- Prevent overlapping polls.
- Recover after refresh.
- Do not display pending as error.

### `src/app/success/page.tsx`

- Resolve state from backend session/order.
- Do not require browser `purchased` flag.
- Provide claim/recovery links.
- Track claim rather than mere page view.

### `src/lib/quiz/store.ts`

- Remove full persistent profile and claim token.
- Use in-memory state + server session.
- Persist only opaque resume metadata if required.

### `src/components/analytics-scripts.tsx`

- Add consent gating.
- Ensure service use works without advertising consent.
- Avoid sensitive parameters.

---

## 16. Release sequence

### Phase 1 — Correctness and design foundation

- New step registry.
- No-default validation.
- Final copy.
- Anti-slop component replacement.
- Correct result visualization.
- Server session.

### Phase 2 — Payment

- Offer endpoint/data.
- MoMo idempotency.
- Mobile deep link.
- Desktop QR.
- Status model.
- IPN verification.
- Recoverable success.

### Phase 3 — App claim

- Single-use claim.
- Deferred link.
- Email recovery.
- Restored payload.
- Remaining app onboarding.
- First-meal route.

### Phase 4 — Production readiness

- Consent/privacy.
- Analytics redaction.
- Accessibility.
- Performance.
- Full E2E.
- Support playbooks.
- Monitoring.

No randomized release. A staged percentage rollout for operational safety is allowed only when all users in the rollout receive the same final funnel.

---

## 17. Launch checklist

- [ ] Final route order implemented.
- [ ] All answer fields used visibly or computationally.
- [ ] No referral-source UI.
- [ ] No body-fat field before payment.
- [ ] No accepted metric defaults.
- [ ] Body review required.
- [ ] Price shown on landing.
- [ ] Price and no-trial disclosed before email.
- [ ] Exact charge and renewal date shown on paywall.
- [ ] One monthly offer only.
- [ ] Mobile MoMo deep link works.
- [ ] Desktop QR works.
- [ ] IPN is authoritative.
- [ ] Checkout is idempotent.
- [ ] Pending is handled correctly.
- [ ] Success survives refresh/storage loss.
- [ ] Claim is single-use and short-lived.
- [ ] App restores answers.
- [ ] User does not repeat web onboarding.
- [ ] First-meal route works.
- [ ] Sensitive analytics redacted.
- [ ] Consent management implemented.
- [ ] 18+ guard implemented.
- [ ] Background beams removed.
- [ ] Moving-border CTA removed.
- [ ] Generic AI orb removed.
- [ ] Generic promise graph removed.
- [ ] Real Nutree product UI used.
- [ ] Unit, integration, and E2E tests pass.
