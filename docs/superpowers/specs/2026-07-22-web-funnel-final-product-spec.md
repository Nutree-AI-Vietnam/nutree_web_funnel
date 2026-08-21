# Nutree Web-to-App Funnel — Final Product Specification

**Date:** 2026-07-22  
**Status:** Final decision  
**Owner:** Nutree product team  
**Applies to:** `nutree_web_funnel`, backend web-funnel APIs, and mobile claim flow  
**Supersedes:** Earlier one-for-one mobile-onboarding screen order where this document conflicts  
**Experimentation:** None. Ship one fixed funnel and measure it.

---

## 1. Executive decision

Nutree will use a **psychological-investment web funnel** rather than an ultra-short calculator.

The user should feel that they are building a plan with Nutree, not completing a generic survey. The funnel therefore retains meaningful motivation, body, and routine questions, but removes screens that do not materially change the calculation, visible personalization, purchase decision, or app handoff.

The fixed journey is:

> Build personal context → confirm body data → define routine → see Nutree summarize the plan → receive an initial result → see the real paid product → save by email → pay 199.000đ through MoMo → open the same plan in the app.

The full web funnel contains:

- **16 meaningful answer events**
- **4 reward/confirmation moments**
- **1 calculated result**
- **1 transparent email commitment**
- **1 transparent monthly MoMo offer**
- **1 recoverable app handoff**

This is intentionally more involving than Welmi-style “fast calculator” onboarding, but more focused than copying the entire in-app onboarding.

---

## 2. Product goal

Convert qualified Vietnamese web visitors into paying, activated Nutree subscribers while preserving trust and plan quality.

The business outcome is not merely a successful charge. The complete success state is:

1. The user understands the product and billing terms.
2. MoMo confirms payment server-side.
3. The user claims the exact plan in Nutree.
4. The user performs the first useful product action, ideally logging the first meal.
5. The user does not need to repeat the web onboarding.

### Primary operating metric

```text
Paid-and-activated visitors
=
visitors who receive a server-confirmed payment,
claim the plan in the app,
and log a first meal within 24 hours
```

Track the full funnel, but do not build variant assignment or experimentation infrastructure.

---

## 3. Product principles

### 3.1 Same onboarding model, different job

The mobile onboarding configures the full product after installation.

The web onboarding must:

- Establish personal motivation.
- Gather the minimum reliable calculation inputs.
- Build a feeling of ownership.
- Demonstrate the recurring product.
- Prepare the user for a transparent payment.
- Preserve continuity into the app.

The post-purchase app flow must:

- Restore the web answers.
- Skip repeated questions.
- Collect only remaining preferences that improve execution.
- Move quickly to the first meal or dashboard.

### 3.2 Every pre-payment question must earn its place

A web question remains before payment only when it does at least one of the following:

1. Changes the calculation.
2. Changes the visible reflection or result.
3. Changes the product demonstration or paid-value explanation.
4. Increases legitimate plan ownership.
5. Is required for payment, account recovery, privacy, or handoff.

Questions that do none of these move into the app or disappear.

### 3.3 The user receives value before payment

The initial result includes:

- Estimated daily calories.
- Protein, carbohydrate, and fat targets.
- Relevant weight-goal context.
- The inputs used.
- An edit path.
- A clear estimate/not-medical-advice statement.

The paid product is not “the number.” It is the system that helps the person execute the plan.

### 3.4 Psychological investment must be ethical

Use:

- Self-reference.
- Meaningful commitments.
- Visible personalization.
- Accurate progress.
- Real social proof.
- Clear ownership language.
- Transparent price and renewal.

Do not use:

- Shame.
- Fear about body size.
- Fake scarcity.
- Fabricated personalization percentages.
- False countdowns.
- Forced waiting.
- Hidden renewal.
- Preselected inaccurate body values.
- Obstruction of cancellation or back navigation.

---

## 4. Target audience

### Primary audience

Vietnamese adults who arrive from paid search, paid social, creator content, or Nutree-owned channels and want help with:

- Weight loss or fat loss.
- Muscle gain.
- Body recomposition.
- Better daily eating structure.
- Calorie and macro tracking.
- Easier meal decisions.
- Recovery after overeating or inconsistent days.

### Eligibility

- Paid web checkout is restricted to users aged 18 or older.
- The funnel does not diagnose or treat medical conditions.
- People with pregnancy, eating-disorder history, medically prescribed diets, or relevant health conditions should be directed to professional guidance rather than an aggressive automated target.

---

## 5. Fixed route map

The quiz sequence and responsibilities are fixed. Every quiz screen renders inside the single `/quiz` route; the active screen is internal client-side flow state.

| # | Route | Screen | Input / output | Purpose |
|---:|---|---|---|---|
| 0 | `/` | Landing | Entry promise | Set outcome, time, free initial result, and eventual price expectation |
| 1 | `/quiz` | Goal | `fitness_goal` | Self-definition and calculation input |
| 2 | `/quiz` | Name | `name` | Self-reference and personalized copy |
| 3 | `/quiz` | Main obstacles | `pain_points`, maximum 2 | Problem recognition and paid-value personalization |
| 4 | `/quiz` | Time pursuing goal | `challenge_duration` | Narrative investment and tone selection |
| 5 | `/quiz` | Desired personal outcome | `motivation` | Positive future orientation |
| 6 | `/quiz` | Personalized reflection | Derived text | Reward progress and prove Nutree listened |
| 7 | `/quiz` | Biological sex + age | `gender`, `age` | Calculation inputs and adult eligibility |
| 8 | `/quiz` | Height + current weight | `height_cm`, `weight_kg` | Calculation inputs |
| 9 | `/quiz` | Target weight | `target_weight_kg` or no numeric target | Goal context |
| 10 | `/quiz` | Body-data confirmation | Confirmation event | Prevent accidental defaults and create explicit commitment |
| 11 | `/quiz` | Daily activity + training | `job_type`, `training_days_per_week`, `training_minutes_per_session` | Calculation and result explanation |
| 12 | `/quiz` | Difficult eating moment | `hardest_eating_moment` | Meal-preview and product-message personalization |
| 13 | `/quiz` | Dietary constraints | `dietary_preferences`, optional | Meal-preview credibility |
| 14 | `/quiz` | Preferred plan style | `support_style` | Self-authored product framing |
| 15 | `/quiz` | Personalized plan summary | Derived summary + confirmation | Endowed progress and ownership |
| 16 | `/quiz` | Calculation | TDEE API or validated fallback | Short anticipation tied to real work |
| 17 | `/quiz` | Initial result + product demonstration | TDEE, macros, explanation | Deliver value and show the paid execution system |
| 18 | `/email` | Save-plan commitment | `email` | Recovery and identity handoff with explicit payment preview |
| 19 | `/paywall` | Nutree Premium offer | Monthly plan | Transparent immediate MoMo purchase |
| 20 | `/momo/return` | Payment status | Server order status | Pending/paid/failed recovery |
| 21 | `/success` | App handoff | Claim token/session | Preserve plan continuity and drive first app action |

### Question count

The funnel contains 16 answer events because some routes collect more than one closely related input:

- `body_basics`: gender and age.
- `body_metrics`: height and current weight.
- `routine`: daily activity, training frequency, and average duration.

These grouped screens should use progressive disclosure inside one route rather than presenting a dense form.

---

## 6. Section architecture

Use four named chapters. Chapter labels are more motivating and comprehensible than a generic 1–24 progress bar.

### Chapter 1 — Mục tiêu của bạn

Routes:

- Goal
- Name
- Challenges
- Duration
- Motivation
- Reflection

User belief at the end:

> “Nutree understands what I want, why it matters, and what usually stops me.”

### Chapter 2 — Cơ thể của bạn

Routes:

- Body basics
- Body metrics
- Target weight
- Body review

User belief at the end:

> “The plan is being calculated from my actual body, not a generic profile.”

### Chapter 3 — Nhịp sống của bạn

Routes:

- Routine
- Eating pattern
- Diet
- Support style

User belief at the end:

> “This plan fits how I live and eat, not only a calorie formula.”

### Chapter 4 — Kế hoạch của bạn

Routes:

- Plan summary
- Calculating
- Result
- Email
- Paywall
- Payment
- Success

User belief at the end:

> “I built this plan; payment activates the system that helps me follow it.”

---

## 7. Screen behavior requirements

### 7.1 Landing

The landing must disclose:

- The concrete outcome: initial calorie and macro targets.
- Approximate effort: around three minutes.
- No account required to start.
- The user sees an initial result before paying.
- The full Nutree Premium plan costs 199.000đ/month via MoMo.

The price may be visually secondary but cannot be hidden until after email capture.

The CTA is:

> Bắt đầu xây kế hoạch

The landing must use real Nutree product content or a clearly labeled example. It must not show a fake “match” percentage, fabricated dashboard, or unexplained static personal result.

### 7.2 Goal

- Single choice.
- Auto-advance after a clear selection.
- Values map to backend `fitness_goal`.
- Use body-neutral labels and avoid shame.

### 7.3 Name

- Ask for first name only.
- Permit 1–40 characters.
- Trim whitespace.
- Do not use the name excessively; use it at high-value reflection moments.

### 7.4 Challenges

- Maximum two choices.
- Explain “Chọn tối đa 2.”
- Each selected challenge must later change at least one reflection sentence or paid-value bullet.
- “Other” should not require a long text field before payment.

### 7.5 Duration and motivation

- One choice each.
- Keep the motivation screen positive.
- Do not ask users to imagine humiliation, rejection, or medical catastrophe.

### 7.6 Reflection

This is a reward screen, not filler.

It must combine:

- First name.
- Goal.
- Main challenge.
- Duration.
- Desired outcome.

The copy should sound specific but not pretend to diagnose the person.

### 7.7 Body basics and metrics

- The user must explicitly interact with or confirm every value.
- No valid placeholder may be silently accepted.
- Age 18+ is enforced before continuing to paid checkout.
- Height and weight ranges are validated on client and server.
- A numeric input alternative must exist beside any wheel picker.
- The interface must support keyboard and screen-reader use.

### 7.8 Target weight

- Ask current weight before target weight.
- Permit “Tôi chưa có con số cụ thể.”
- Validate contradictory or extreme targets.
- Do not block recomposition or general-health users who do not want a scale target.

### 7.9 Body review

Show a compact summary:

```text
29 tuổi · Nữ · 162 cm · 58 kg · Mục tiêu 53 kg
```

Actions:

- `Đúng, tiếp tục`
- `Chỉnh sửa`

The confirmation event is required. This screen is the protection against accepted default values.

### 7.10 Routine

Use progressive disclosure:

1. Daily activity.
2. Training days.
3. Average session duration.

Do not ask training experience or exercise type before payment. Collect those inside the app only when they alter recommendations.

### 7.11 Eating pattern

Ask when eating is hardest:

- Morning.
- Lunch.
- Evening.
- Late night.
- Weekend.
- Eating out/social occasions.

The answer changes the result-page product example.

### 7.12 Diet

- Optional.
- Use a simplified list.
- `none` is exclusive.
- Other options may be multi-select, maximum two.
- Detailed allergies and medical diets belong in a safety-aware app flow.

### 7.13 Support style

Ask how the user wants the plan to feel:

- Simple.
- Flexible.
- Detailed.
- Gentle and sustainable.

This is a final self-authored commitment. It changes result/paywall framing but must not change scientifically necessary guardrails.

### 7.14 Plan summary

Show what Nutree has assembled:

```text
Kế hoạch của [name] sẽ ưu tiên:
✓ [goal]
✓ [challenge response]
✓ [routine response]
✓ [support style]
```

CTA:

> Tạo kế hoạch của tôi

Do not show a fake personalization score.

### 7.15 Calculating

- Start the real API request immediately.
- Minimum display only long enough to prevent a flash, approximately 600–1,200 ms.
- Do not force four seconds.
- Use real statements derived from answers.
- Route immediately once result and minimum display are complete.
- If the API fails, use only a validated backend-parity fallback.
- Clearly log the result source internally; do not alarm users unless the result is unreliable.

### 7.16 Result

The result has four blocks:

#### A. Personalized outcome

- Calories/day.
- Protein/day.
- Carbohydrate/day.
- Fat/day.
- Goal context.
- Inputs used.
- Edit link.
- Estimate disclaimer.

#### B. Why this fits the user

Examples:

- “Dựa trên lịch tập 3–4 buổi/tuần.”
- “Ưu tiên cách theo dõi nhanh vì bạn chọn ‘không có thời gian’.”
- “Gợi ý bữa tối linh hoạt vì buổi tối là thời điểm khó nhất.”

Only show statements supported by collected answers.

#### C. Real Nutree product demonstration

Show the real recurring loop:

1. Photograph or search a meal.
2. See calories/macros and remaining daily budget.
3. Receive meal guidance.
4. Rebalance the week after an over-target day.

Use real product UI, a faithful screenshot, or production-equivalent mock data. Do not use a generic upward progress graph.

#### D. Paid continuation

CTA:

> Lưu và mở khóa kế hoạch

The CTA goes to email. It must not say “free” at this point.

### 7.17 Email

The email screen is a deliberate micro-commitment and recovery mechanism.

It must explicitly say:

- The plan will be saved and sent.
- The next screen is the Nutree Premium offer.
- The offer is 199.000đ/month through MoMo.
- There is no free trial on this web offer.

Do not collect email under the implication that no payment follows.

### 7.18 Paywall

One plan only:

```text
Nutree Premium
199.000đ charged today
Automatic renewal: 199.000đ/month through MoMo
Next billing date: exact date
No free trial
```

The paywall includes:

- Personalized headline.
- 4–5 concrete benefits.
- Verified local proof.
- Email/account context.
- Exact amount charged today.
- Exact renewal terms.
- Subscription-management path.
- Terms and privacy links.
- MoMo trust cue.
- One primary CTA.

CTA:

> Mở khóa kế hoạch với 199.000đ

Do not include:

- Annual option.
- Hidden weekly plan.
- Crossed-out fake price.
- Discount wheel.
- Countdown.
- “Recommended” badge on a single plan.
- “No IAP” or other internal technical language.

### 7.19 MoMo

On mobile:

- Prefer returned MoMo deep link.
- Fall back to web payment URL.
- Provide “Mở lại MoMo.”

On desktop:

- Keep Nutree open.
- Show returned QR.
- Poll the server safely.
- Display transaction reference.

Server-to-server confirmation is authoritative.

### 7.20 Success

The success page must say:

> The plan is already saved. The user does not need to answer the quiz again.

Mobile:

- Open Nutree and claim the plan.

Desktop:

- QR.
- App Store/Google Play links.
- Email recovery link.

The app opens with the restored goal, name, targets, and selected challenge, then immediately guides the user to the first meal or another concrete action.

---

## 8. Progressive onboarding split

### Web before payment

Collect:

- `fitness_goal`
- `name`
- `pain_points`
- `challenge_duration`
- `motivation`
- `gender`
- `age`
- `height_cm`
- `weight_kg`
- `target_weight_kg` or no target
- `job_type`
- `training_days_per_week`
- `training_minutes_per_session`
- `hardest_eating_moment`
- `dietary_preferences`
- `support_style`
- campaign attribution automatically

### App after payment

Collect only when needed:

- Training type.
- Training experience.
- Detailed dietary preferences.
- Allergies and safety-related diet information.
- Preferred meal schedule.
- Notification preferences.
- Health integration.
- More precise body composition.
- First meal.
- Any app permissions.

The app must not re-ask web answers unless the user chooses to edit them.

---

## 9. Removed or moved current steps

| Current step | Final action |
|---|---|
| `referral_source` | Remove from UI; capture UTM, click IDs, referrer, and campaign metadata automatically |
| `body_fat` | Move to app; optional and often unreliable before trust is established |
| `experience` | Move to app |
| `training_type` | Move to app |
| Separate `training_days` and `training_duration` pages | Merge into `routine` |
| `tdee_science_promo` | Remove as standalone page |
| `smart_macro_promo` | Remove as standalone page |
| `smart_meals_promo` | Remove as standalone page |
| Generic `result_promising` graph | Replace with real product demonstration on result page |
| Separate generic plan preview on landing | Replace with real product content or clearly labeled example |

---

## 10. Data model changes

Add optional fields to the shared web onboarding payload:

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

interface WebOnboardingExtensions {
  motivation?: Motivation;
  hardest_eating_moment?: HardestEatingMoment;
  support_style?: SupportStyle;
}
```

These fields may be stored with the lead and passed into the app. They should not be sent to advertising platforms.

---

## 11. Personalization matrix

At least one visible output must change for every psychological question.

### Challenge → product emphasis

| Challenge | Result/paywall emphasis |
|---|---|
| No time | Photo logging, quick meal choices, low-friction tracking |
| Do not know what to eat | Meal suggestions and next-meal guidance |
| Cravings/snacking | Remaining budget and planned snack structure |
| Cannot stay consistent | Weekly view, gentle correction, progress continuity |
| Eating out | Flexible entries and weekly rebalancing |
| Conflicting advice | One clear daily target and explanation |
| Stress eating | Non-judgmental logging and recovery; no clinical claims |

### Eating moment → example

| Moment | Result-page example |
|---|---|
| Morning | Breakfast example |
| Lunch | Office/lunch example |
| Evening | Dinner example |
| Late night | Planned snack/remaining-budget example |
| Weekend | Weekly-budget flexibility example |
| Eating out | Restaurant/photo logging example |

### Support style → tone

| Style | Tone |
|---|---|
| Simple | Fewer numbers, direct next action |
| Flexible | Weekly budget and eating-out flexibility |
| Detailed | Macro breakdown and trend visibility |
| Gentle | Sustainable language and no-perfect-day framing |

---

## 12. Offer decision

The fixed launch offer is:

- **Plan:** Nutree Premium monthly
- **Price:** 199.000đ
- **Charge:** Immediate
- **Renewal:** Monthly through MoMo
- **Trial:** None for this web offer
- **Annual plan:** Not shown during first web purchase
- **Discount recovery:** None
- **Alternative plans:** None hidden behind links

The exact next billing date is calculated and displayed before the user leaves for MoMo.

---

## 13. Analytics without experimentation

Use one immutable funnel identifier:

```text
funnel_version = "web_psychological_investment_2026_07_22"
```

Do not use:

- `variant_id`
- randomized assignment
- experiment exposure
- multivariate flags

Measure:

- Landing view.
- Quiz start.
- Step view.
- Step completion.
- Validation error.
- Body review confirmation.
- Plan summary confirmation.
- Result view.
- Email submission.
- Paywall view.
- Checkout start.
- Server-confirmed purchase.
- App claim.
- First meal.
- Renewal.
- Cancellation.
- Refund.

Review drop-off by source and device, but keep one product direction.

---

## 14. Acceptance criteria

The final funnel is release-ready only when all are true.

### Product

- The user sees price context before beginning and exact terms before email/payment.
- All 16 answer events visibly contribute to calculation, reflection, or product framing.
- The result page demonstrates actual Nutree product behavior.
- The user can edit the inputs used for the result.
- The app restores all web answers.
- No paid user repeats the web onboarding.

### Data correctness

- No untouched default value can be submitted.
- Optional body fat is not prefilled or collected before payment.
- Target weight may be omitted.
- Client and server ranges match.
- The TDEE fallback matches the authoritative implementation.
- Macro visualizations use calorie contribution, not raw gram proportion.

### Payment

- Checkout creation is idempotent.
- Duplicate clicks do not create multiple active orders.
- Mobile deep link and desktop QR work.
- Pending is not shown as failed.
- MoMo server notification confirms payment.
- Success is recoverable after refresh, browser change, or lost local storage.
- Renewal date and cancellation route are visible.

### Privacy and safety

- Paid funnel is 18+.
- Health/body data purpose is explained.
- Terms and privacy are linked.
- Ad pixels do not receive body data, email, order ID, or claim token.
- Sensitive profile data is not indefinitely persisted in local storage.
- Claim tokens are short-lived, single-use, and paid-order-bound.

### Design

- No background beams.
- No moving-border CTA.
- No generic AI orb.
- No fake progress graph.
- No unexplained personalization percentage.
- No more than one primary CTA per screen.
- Real product imagery is used.
- Reduced motion is respected.
- The funnel works at 320, 375, 390, 430, and desktop widths.

---

## 15. Out of scope

- A/B testing framework.
- Annual or weekly offer.
- Discount wheel.
- Free trial.
- Internationalization beyond Vietnamese launch copy.
- Full medical intake.
- Minor/guardian purchase flow.
- Rebuilding the entire mobile onboarding.
- Collecting all post-purchase preferences on the web.
