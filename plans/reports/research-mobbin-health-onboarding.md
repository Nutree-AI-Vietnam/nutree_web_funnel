# Research Report: Mobbin + Authoritative UX References for Health Onboarding

## Bottom Line

Best fit for this repo: a calm, guided onboarding flow that uses credibility cues early, a short medical/allergy gate before sensitive inputs, a reassuring pre-calculation screen, a determinate progress state for long calculations, and restrained email capture with explicit value + privacy cues.

Do not rely on carousel slides alone for trust. Use them as support, not proof.

## Sources Consulted

Primary example library:
- Mobbin mobile explore: https://mobbin.com/explore/mobile
- Mobbin onboarding flow category: https://mobbin.com/explore/mobile/flows/onboarding
- Mobbin health/fitness category: https://mobbin.com/explore/mobile/app-categories/health-fitness
- Mobbin Lifesum onboarding flow: https://mobbin.com/explore/flows/9f17e6ae-cc01-4e9e-abde-b2b01efaabbc
- Mobbin Noom onboarding flow: https://mobbin.com/explore/flows/c1404418-d156-4add-9abe-6b0b94d72628
- Mobbin Lifesum weight goal selection: https://mobbin.com/explore/screens/234cc9c8-7503-4b05-93a3-16ab472792db

Authoritative UX / platform guidance:
- Nielsen Norman Group, progress indicators: https://www.nngroup.com/articles/progress-indicators/
- Nielsen Norman Group, response-time limits: https://www.nngroup.com/articles/response-times-3-important-limits/
- Nielsen Norman Group, visibility of system status: https://www.nngroup.com/articles/visibility-system-status/
- Nielsen Norman Group, cognitive load in forms: https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/
- Nielsen Norman Group, behavioral economics for UX: https://www.nngroup.com/articles/behavioral-economics-for-ux/
- Apple HIG, onboarding: https://developer.apple.com/design/human-interface-guidelines/onboarding
- Apple HIG, sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- Apple HIG, alerts: https://developer.apple.com/design/human-interface-guidelines/alerts
- Apple HIG, progress indicators: https://developer.apple.com/design/human-interface-guidelines/progress-indicators
- Material Design 3, dialogs: https://m3.material.io/components/dialogs/guidelines
- Material Design 3, progress indicators: https://m3.material.io/components/progress-indicators/overview
- FDA email updates example: https://www.fda.gov/about-fda/contact-fda/get-email-updates

## What The Sources Say

### 1) Carousel credibility slides

Mobbin shows many health onboarding flows that mix introduction, account setup, health-plan setup, and optional premium upsell in a guided sequence. Lifesum and Noom are the clearest examples in the set. Mobbin’s health category also shows that real health apps often combine carousels, cards, avatars, and progress indicators rather than using a pure marketing-style slide deck.

Key references:
- https://mobbin.com/explore/flows/9f17e6ae-cc01-4e9e-abde-b2b01efaabbc
- https://mobbin.com/explore/flows/c1404418-d156-4add-9abe-6b0b94d72628
- https://mobbin.com/explore/mobile/app-categories/health-fitness

Interpretation:
- Credibility slides work best when they are short, concrete, and tied to the next action.
- Social proof should answer “why this app, why now?” in one screen, not become a full story.
- If the carousel is longer than 3 screens, trust and attention decay fast.

### 2) Medical disclaimer / allergy modal

Apple and Material both support using a sheet or dialog when you need to interrupt a flow for important information or a specific task. Apple says sheets are useful for requesting specific information before returning to the parent view; Material says dialogs are for important prompts. For health-related guidance, this is the right pattern for an allergy/medical disclosure gate.

Key references:
- https://developer.apple.com/design/human-interface-guidelines/sheets
- https://developer.apple.com/design/human-interface-guidelines/alerts
- https://m3.material.io/components/dialogs/guidelines
- https://www.fda.gov/medical-devices/device-software-functions-including-mobile-medical-applications/examples-software-functions-are-not-medical-devices

Interpretation:
- Use a modal only when the user must actively acknowledge risk or state allergies/contraindications.
- Keep it short. The purpose is informed continuation, not legal theater.
- Treat this as a safety gate, not a conversion screen.

### 3) Target-weight transition

Mobbin’s weight-goal examples show the target weight as a focused choice screen with a progress indicator. This is a good transition point between personal input and the more emotionally loaded “calculation” phase.

Key references:
- https://mobbin.com/explore/screens/234cc9c8-7503-4b05-93a3-16ab472792db
- https://mobbin.com/explore/flows/9f17e6ae-cc01-4e9e-abde-b2b01efaabbc

Interpretation:
- The target-weight screen should feel like a checkpoint, not a demand.
- Show one primary decision, one supporting sentence, and one clear next step.
- Avoid stacking multiple heavy questions on the same screen.

### 4) Emotionally reassuring pre-calculation screen

NN/g’s cognitive-load guidance is explicit: structure, transparency, clarity, and support reduce friction. This fits a pre-calculation screen better than a raw spinner. Users need to know what is happening, why it matters, and how long it may take.

Key references:
- https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/
- https://www.nngroup.com/articles/visibility-system-status/
- https://developer.apple.com/design/human-interface-guidelines/onboarding

Interpretation:
- Tell the user what will happen next.
- Reassure them that inputs are being used to personalize, not to punish.
- This is the place for soft language, not the calculation result itself.

### 5) 10-second calculation progress

NN/g is very clear: use a progress indicator for actions longer than about 1 second, and percent-done indicators for operations taking more than about 10 seconds. Apple and Material both reinforce that progress indicators should communicate that the system is active.

Key references:
- https://www.nngroup.com/articles/progress-indicators/
- https://www.nngroup.com/articles/response-times-3-important-limits/
- https://developer.apple.com/design/human-interface-guidelines/progress-indicators
- https://m3.material.io/components/progress-indicators/overview

Interpretation:
- If the calculation is usually under 10 seconds, use staged feedback or a short animated state.
- If it can exceed 10 seconds, show determinate progress with steps or percentage, not an endless spinner.
- Always give immediate feedback on tap.

### 6) Email capture trust / social proof

NN/g’s behavioral economics guidance supports visible social proof and identity cues when users ask “is this for someone like me?” FDA’s email-updates page is a decent trust benchmark: it says the email address is used only to deliver the requested information and manage subscription preferences. That is the kind of narrow promise a health funnel should make.

Key references:
- https://www.nngroup.com/articles/behavioral-economics-for-ux/
- https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/
- https://www.fda.gov/about-fda/contact-fda/get-email-updates

Interpretation:
- Email capture should happen after the user has seen value, not before.
- Put a short privacy promise directly under the field.
- Add one line of social proof or authority cue, but keep it specific and believable.

### 7) Onboarding progress indicators

Mobbin repeatedly surfaces progress indicators in health onboarding. NN/g and the platform guides agree that progress belongs in any multi-step or slow flow because it lowers uncertainty and helps users finish.

Key references:
- https://mobbin.com/explore/mobile/ui-elements/progress-indicator
- https://mobbin.com/explore/mobile/flows/onboarding
- https://www.nngroup.com/articles/visibility-system-status/
- https://developer.apple.com/design/human-interface-guidelines/progress-indicators
- https://m3.material.io/components/progress-indicators/overview

Interpretation:
- Use a persistent step indicator for the whole onboarding, not a per-screen mystery.
- If the flow is long, show both current step and total steps.
- Progress should feel honest, not gamified.

## Ranked Recommendations For This Repo

### 1. Build a trust-first flow, not a slide-first flow

Recommendation:
- Keep carousel credibility slides to 2-3 screens max.
- Use them to support authority, not to carry the whole pitch.
- Follow immediately with one concrete task: target selection, disclaimer acknowledgment, or email entry.

Why:
- Best fit for health onboarding.
- Lower risk than extending the intro deck.
- Better alignment with Mobbin patterns and NN/g trust guidance.

Trade-offs:
- Shorter intro may reduce top-of-funnel persuasion in theory.
- In practice it usually improves completion by getting to a real action sooner.

Adoption risk:
- Low. This is mainstream onboarding structure.
- Main failure mode is making the slides too generic or too long.

Architectural fit:
- Strong fit for a Next.js funnel with sequential steps and visible progress.

### 2. Put medical/allergy disclosure behind a short modal or sheet

Recommendation:
- Use a modal sheet before any sensitive calculation or recommendation that depends on allergies, medical conditions, or contraindications.
- Keep the copy terse, actionable, and explicit.
- Require acknowledgment only when the flow truly needs it.

Why:
- It matches platform guidance for requesting specific information and handling important prompts.
- It reduces legal/safety ambiguity without derailing the funnel.

Trade-offs:
- Adds one interruption.
- If overused, it will feel like friction and can hurt completion.

Adoption risk:
- Medium. The risk is not the modal itself; the risk is bloated copy or over-lawyering the flow.

Architectural fit:
- Strong fit if the funnel already has step-based routing and stateful gating.

### 3. Make the target-weight screen a calm transition, not another questionnaire

Recommendation:
- Present target weight as a single transition checkpoint with a supportive sentence.
- Keep the visual hierarchy simple: current state, target, continue.

Why:
- This is the psychologically sensitive part of the funnel.
- It should feel like personalization, not pressure.

Trade-offs:
- Less room for persuasion copy.
- Better user comfort and less drop-off risk.

Adoption risk:
- Low.

Architectural fit:
- Excellent for a sequential onboarding state machine.

### 4. Replace a raw spinner with a staged, deterministic progress experience

Recommendation:
- For the calculation phase, show a reassuring pre-calc screen first.
- Then show a progress state that reflects the actual operation.
- If runtime can exceed ~10 seconds, use percent-done or step-based progress.

Why:
- This is the clearest evidence-backed UX improvement in the set.
- NN/g specifically recommends progress indicators for long waits and percent-done for ~10+ second waits.

Trade-offs:
- Requires the backend/front-end to agree on the likely wait model.
- Fake progress bars are worse than no bar.

Adoption risk:
- Medium if the backend time varies wildly.
- Low if the calculation has predictable stages.

Architectural fit:
- Very strong if the repo already knows the calculation phases or can expose them.

### 5. Treat email capture as a trust exchange, not a conversion trap

Recommendation:
- Ask for email only after the user has enough perceived value.
- Add one-line reassurance under the field: why you need it, what you’ll send, and that it is not spam.
- Add one specific trust cue, such as “we only use this to send your result and save your progress.”

Why:
- This is the right balance between conversion and trust.
- Health users are more sensitive to data collection than generic consumer users.

Trade-offs:
- A late ask may reduce raw capture rate.
- It usually improves lead quality and completion.

Adoption risk:
- Low.

Architectural fit:
- Strong fit for a funnel that already has a final summary/result moment.

### 6. Keep progress indicators visible throughout onboarding

Recommendation:
- Use a persistent stepper or progress bar across the funnel.
- Show progress on the long path and on the calc wait state.
- Make back/exit behavior obvious.

Why:
- Multi-step health onboarding is inherently uncertain.
- Progress indicators reduce abandonment and make the flow feel manageable.

Trade-offs:
- Too much detail can make the flow feel longer.
- Too little detail makes users feel lost.

Adoption risk:
- Low.

Architectural fit:
- Excellent for the repo’s step-based onboarding model.

## Concrete Guidance For The Repo

- Use the carousel for authority and reassurance, not for feature dumping.
- Put the allergy/medical disclaimer in a sheet or modal before anything that could be interpreted as personalized medical guidance.
- Make the target-weight step visually simple and emotionally neutral.
- Add a pre-calculation screen with one clear sentence about what happens next.
- For the 10-second wait, use a determinate or staged progress UI, not a spinner that stalls the user’s confidence.
- Capture email only after value is visible, and pair it with a short privacy statement and one credible trust cue.
- Show onboarding progress consistently across the flow.

## What I Would Not Do

- Do not use a 5-7 slide marketing carousel as the main trust mechanism.
- Do not bury the disclaimer in a footer or terms page.
- Do not jump straight from target weight entry into a silent loading state.
- Do not use an indefinite spinner for a predictable calculation.
- Do not ask for email before the user sees any benefit.
- Do not remove progress indicators to make the flow look “simpler.” In health onboarding, uncertainty is the bigger problem.

## Limitations

- Mobbin is a strong pattern library, not a normative standard. It shows what high-performing apps do, but not why those patterns won in controlled experiments.
- I did not inspect this repo’s current onboarding source code. These are design recommendations only.
- I did not validate copy against legal or clinical requirements. A product/legal review is still needed for the disclaimer language.
- I did not run any A/B tests. The recommendations are evidence-based, but not measured on this product.

## Final Recommendation

Ranked choice for this repo:
1. Trust-first onboarding with short credibility support.
2. Short medical/allergy gate before sensitive personalization.
3. Calm target-weight transition.
4. Reassuring pre-calculation screen.
5. Determinate progress for long calculations.
6. Email capture with explicit trust and privacy cues.
7. Persistent onboarding progress indicators.

That sequence is the best blend of credibility, conversion, and low implementation risk for a health funnel.
