# Nutree Web Funnel — Anti-AI-Slop Design Standard

**Date:** 2026-07-22  
**Status:** Final design direction  
**Purpose:** Ensure the funnel looks like a trustworthy Nutree product—not a generic AI-generated landing page  
**Applies to:** Landing, quiz, result, email, paywall, MoMo return, and success

---

## 1. What “AI slop” means in this project

“AI slop” is design that looks polished at first glance but contains little product meaning.

Common signals:

- Constant teal/purple gradients.
- Animated background beams.
- Glowing glass cards.
- Rotating conic borders.
- Generic AI orb or neural-network illustration.
- Floating chips labeled “AI,” “BMI,” or “Macro.”
- Huge rounded corners everywhere.
- Fake dashboards.
- Fake personalization percentages.
- Decorative charts without units or data.
- Too many shadows and blurs.
- Stock wellness imagery unrelated to the actual product.
- Copy such as “unlock your potential” or “AI-powered transformation.”
- Animation applied to every panel.
- A CTA that shimmers, pulses, spins, or chases the pointer.
- Visual hierarchy based on effects rather than information.

These patterns make Nutree appear less credible, especially when asking for body data and immediate payment.

---

## 2. Design north star

The funnel should feel like:

> A calm, modern Vietnamese nutrition product that turns the user’s own information into a useful plan.

It should not feel like:

> A generic AI SaaS template, crypto checkout, game landing page, or speculative health dashboard.

### Desired attributes

- Trustworthy.
- Quietly premium.
- Human.
- Data-literate.
- Mobile-native.
- Product-led.
- Specific to nutrition.
- Clearly Vietnamese.
- Easy to scan.
- Easy to edit.
- Comfortable during a three-minute flow.

---

## 3. Visual principles

### 3.1 Product content is the hero

The strongest visuals are:

- The user’s actual calorie and macro result.
- A real meal-photo logging screen.
- A real remaining-budget screen.
- A real weekly balance screen.
- A real meal suggestion.
- Verified App Store proof.
- The user’s own plan summary.

Do not substitute a generic abstract illustration for available product content.

### 3.2 One visual idea per screen

Each screen should have:

- One heading.
- One main interaction or result.
- One support sentence.
- One primary CTA, when required.

Avoid stacking:

- Badge.
- Eyebrow.
- Headline.
- Subheadline.
- Three cards.
- Floating pills.
- Chart.
- Testimonial.
- CTA.
- Legal text.

A quiz screen should not look like a full marketing homepage.

### 3.3 Calm surfaces

Use:

- Solid off-white page background.
- White or very lightly tinted content surfaces.
- One-pixel borders.
- Restrained shadow only when needed to separate layers.
- Brand green for primary action.
- Teal as an accent, not a glow source.

Avoid:

- Glassmorphism.
- Backdrop blur on every surface.
- Multi-layer radial gradients.
- Full-screen moving decoration.
- Frosted cards over animated backgrounds.

### 3.4 Real hierarchy, not effect hierarchy

Hierarchy comes from:

- Font size.
- Font weight.
- Spacing.
- Alignment.
- Content grouping.
- Contrast.

It does not come from:

- Glow.
- Motion.
- Neon outlines.
- Multiple gradients.
- 3D extrusion.

---

## 4. Design tokens

The existing Nutree palette can remain, but its use must be simplified.

### Color

```css
--bg: #FAFCFB;
--surface: #FFFFFF;
--surface-subtle: #F3F8F6;
--forest: #1A4739;
--forest-dark: #0F1F1A;
--teal: #29B6A1;
--text: #1C2B26;
--text-secondary: #5F7069;
--border: #D4E5DE;
--success: #168B62;
--warning: #B7791F;
--error: #C83B3B;
```

Rules:

- Primary CTA: solid `forest-dark`.
- Selected state: subtle teal-tinted background + forest border.
- Teal is for focus, progress, and data emphasis.
- Red is only for errors.
- Gradients are not used for decorative page backgrounds.
- Data visualization may use multiple colors only when each color has a clear legend.

### Typography

Use Be Vietnam Pro.

Recommended scale:

```text
Display/result number: 44–56 px, 800
Screen heading: 28–34 px, 700–800
Section heading: 20–24 px, 700
Body: 16–18 px, 400–500
Support text: 14–15 px, 400–500
Legal: 12–13 px, 400
```

Rules:

- Avoid uppercase except short labels.
- Avoid excessive letter spacing.
- Use bold for meaning, not decoration.
- Do not make every label bold.

### Spacing

Use an 8-point base:

```text
4, 8, 12, 16, 24, 32, 40, 48
```

Minimum horizontal mobile padding: 20 px.

### Radius

```text
Input/button: 14–16 px
Card: 16–20 px
Large result panel: 20–24 px
Pills/tags only: 999 px
```

Do not use 32–40 px radius on every surface.

### Shadow

One restrained shadow token:

```css
box-shadow: 0 10px 30px rgb(15 31 26 / 0.08);
```

No colored glow.

---

## 5. Component standard

### 5.1 Primary button

Use a solid button:

- Dark forest background.
- White text.
- 52–56 px minimum height.
- 16 px radius.
- No moving border.
- No shimmer.
- No pulse.
- No infinite animation.
- Press state: slight scale or opacity change.
- Clear disabled state.
- Full keyboard focus ring.

Replace the current moving-conic-border CTA with a normal `PrimaryButton`.

### 5.2 Secondary button

- White background.
- One-pixel border.
- Forest text.
- Used for Edit, Back, Retry, and alternative non-payment actions.

### 5.3 Choice card

- Flat surface.
- Clear border.
- Selected state uses border + subtle background + checkmark.
- Optional simple icon only when it conveys meaning.
- No glowing outline.
- No animated gradient.

### 5.4 Metric input

Must support:

- Wheel or slider for touch convenience.
- Tap-to-type numeric input.
- Unit.
- Current value.
- Valid range.
- Explicit confirmation.
- Screen-reader label.

The picker should not imply a default is accepted before user interaction.

### 5.5 Progress

Show:

- Chapter label.
- Step number within chapter.
- A simple static progress line.

No animated beam or glowing trail.

### 5.6 Reflection panel

- Plain white surface.
- One personalized heading.
- Two or three sentences.
- A compact “Nutree sẽ ưu tiên” list.

No illustration is required. The copy is the reward.

### 5.7 Result card

The result number is dominant.

Structure:

1. Calories.
2. Macro targets.
3. “Calculated from” summary.
4. Edit action.
5. Estimate disclaimer.

Do not use a decorative ring with an unexplained percentage.

### 5.8 Product demonstration

Use real app frames or production-equivalent UI:

- Meal photo.
- Detected food result.
- Remaining budget.
- Weekly balance.

Show one simple sequence, not a collage of ten cards.

### 5.9 Paywall

The paywall is a checkout, not a visual spectacle.

Layout:

1. Personalized headline.
2. Price and today’s charge.
3. Renewal date and no-trial statement.
4. Concrete benefits.
5. Local proof.
6. Terms/privacy/manage links.
7. One MoMo CTA.

No glowing card around the plan. No “recommended” tag for a single option.

---

## 6. Remove or redesign current visual patterns

### Remove

- `BackgroundBeams`
- Infinite floating beams
- `MovingBorderButton`
- `MovingBorderLink`
- Rotating conic CTA border
- Generic `GlowingCard` treatment
- Generic “AI” orb in calculation
- Floating `TDEE`, `BMI`, `Macro` chips
- Generic upward promise graph
- Hardcoded “72% match”
- Unexplained progress rings
- Decorative blur blobs
- Repeated glass/backdrop-blur panels

### Redesign

#### Calculation

Replace the AI orb with:

```text
Đang tính mục tiêu khởi đầu
✓ Đã đọc chỉ số cơ thể
✓ Đã tính mức vận động
• Đang cân bằng macro theo mục tiêu
```

Use a simple check list and short progress indicator.

#### Result-promising

Remove the generic line chart.

Replace with a real flow:

```text
Ảnh bữa ăn
→ Calo và macro
→ Phần còn lại hôm nay
→ Cân bằng lại cả tuần
```

#### Landing preview

Use one of:

- Real app screenshot.
- Realistic product frame clearly labeled “Ví dụ.”
- A compact three-step product loop.

Do not use fake personal metrics as an unlabeled example.

---

## 7. Motion standard

Motion is functional.

Allowed:

- 150–240 ms page transition.
- Selection confirmation.
- Progress width change.
- Number count-up once on the result.
- Payment-status transition.
- App-claim success confirmation.

Not allowed:

- Infinite floating.
- Background drift.
- Pulsing CTA.
- Repeating dashed-line animation.
- Continuous rotating border.
- Constant parallax.
- Confetti before server-confirmed payment.
- Long staged animation when processing is complete.

Respect `prefers-reduced-motion`.

No essential meaning may depend on animation.

---

## 8. Image and illustration standard

### Preferred imagery

1. Real Nutree screenshots.
2. Real Vietnamese meal photographs used in the product.
3. Real icon set used in the app.
4. Simple diagrams built from product UI.
5. Verified App Store badge/rating presentation.

### Avoid

- Generic AI-generated healthy bowl.
- Unrealistic perfect body imagery.
- Before/after bodies.
- Abstract brain/neural-network graphics.
- Robot mascots.
- 3D floating vegetables.
- Stock photos unrelated to the selected diet.
- AI-generated app screenshots.
- Fake user avatars.

Every image must answer:

> “What does this teach the user about Nutree?”

If the answer is only “it looks modern,” remove it.

---

## 9. Copy anti-slop standard

Banned or strongly discouraged:

- “Unlock your full potential.”
- “Transform your life today.”
- “AI-powered journey.”
- “Science-backed revolution.”
- “Personalized just for you” without evidence.
- “Advanced algorithms.”
- “Seamless experience.”
- “Next-level nutrition.”
- “Smarter, healthier you.”
- “100% customized.”
- “Guaranteed results.”

Preferred:

- “Chụp món ăn để ghi nhận nhanh.”
- “Biết hôm nay còn bao nhiêu calo.”
- “Tự cân bằng lại ngân sách dinh dưỡng trong tuần.”
- “Mục tiêu được ước tính từ tuổi, chiều cao, cân nặng, mức vận động và mục tiêu của bạn.”
- “Bạn có thể chỉnh lại thông tin bất kỳ lúc nào.”

---

## 10. Mobile layout standard

### Widths to validate

- 320 px
- 375 px
- 390 px
- 430 px
- 768 px
- Desktop

### Rules

- Primary CTA stays reachable without covering content.
- Safe-area bottom padding is respected.
- No horizontal scrolling.
- Choice cards remain at least 48 px high.
- The keyboard does not hide the active input or CTA.
- Wheel pickers do not trap scroll.
- Long Vietnamese labels wrap cleanly.
- Paywall terms remain readable.
- Desktop uses a centered, wider result/paywall layout; it does not simply stretch a 430 px phone column indefinitely.

---

## 11. Accessibility

- WCAG AA contrast minimum.
- Visible keyboard focus.
- Semantic headings.
- Real form labels.
- `aria-describedby` for hints/errors.
- `aria-live` for payment status.
- No auto-advance that prevents screen-reader confirmation.
- Back navigation works.
- Touch targets at least 44×44 px.
- Motion reduction respected.
- Color is never the only selected/error signal.
- Charts include text equivalents.
- Error messages explain how to fix the issue.

---

## 12. Design QA checklist

A screen fails review if any answer is “yes”:

- Is there a decorative gradient with no product meaning?
- Is there a glow around a normal card?
- Is a CTA animated continuously?
- Is “AI” being used as a visual object rather than a feature?
- Is a chart missing units, source, or explanation?
- Is a percentage unexplained?
- Is the page trying to show more than one main action?
- Is the user’s own data visually weaker than decoration?
- Could this screen belong to any AI startup by changing the logo?
- Is the product screenshot fake or disconnected from the actual app?
- Does the page use multiple blur layers?
- Are all cards oversized and rounded?
- Does motion continue after the user has understood the screen?
- Is the copy generic enough to be produced for any wellness app?
- Are price and renewal visually de-emphasized?
- Is any body imagery likely to create shame?
