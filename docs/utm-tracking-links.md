# UTM tracking links

How to build campaign links into the web funnel, what the funnel does with them, and
how to check that attribution arrived.

## Link format

```
https://quiz.nutreeai.com/survey/vi/?utm_source=nutree_website&utm_medium=owned&utm_content=home_hero
https://quiz.nutreeai.com/survey/en/?utm_source=nutree_website&utm_medium=owned&utm_content=home_hero
```

- `/survey/vi` is the Vietnamese funnel, `/survey/en` the English one.
- `https://quiz.nutreeai.com/?utm_source=...` also works. The root route picks the locale from
  the visitor's country and forwards the whole query string, so use it when one link has to
  serve both markets.
- The trailing slash is optional. Next.js redirects `/survey/en/` to `/survey/en` and keeps the
  query string.
- Legacy routes (`/quiz`, `/quiz/<step>`, `/email`, `/paywall`, `/checkout`, `/welcome-gift`,
  `/exit-offer`) forward their query string to the survey as well.
- Preview deployments use `https://quiz.preview.nutreeai.com` with the same paths.

## Parameters

| Parameter | Meaning | Examples |
| --- | --- | --- |
| `utm_source` | Where the click came from | `nutree_website`, `facebook`, `instagram`, `tiktok`, `google`, `newsletter`, `app` |
| `utm_medium` | Channel type | `owned`, `paid_social`, `paid_search`, `email`, `social`, `referral`, `affiliate` |
| `utm_campaign` | Campaign, launch, or offer name. Optional for owned placements | `launch_2026`, `summer_cut`, `black_friday` |
| `utm_content` | Placement or creative that was clicked | `home_hero`, `nav_cta`, `footer_cta`, `pricing_cta`, `blog_inline`, `video_a` |
| `utm_term` | Paid-search keyword | `meal_plan_app` |
| `utm_id` | Platform campaign ID, when the platform supplies one | `120210000000` |

Rules:

- Lowercase ASCII, words joined with `_`, no spaces. Values are case-sensitive in every
  analytics tool, so `Home_Hero` and `home_hero` would report as two placements.
- Keep one meaning per parameter: source says where, medium says what kind of channel,
  content says which placement or creative.
- Values longer than 180 characters are truncated before storage.
- Never put personal data in a link.

Ad platforms append their own click IDs (`fbclid`, `gclid`, `gbraid`, `wbraid`, `ttclid`).
The funnel captures them automatically; nothing to add by hand.

## Ready-made links for the marketing site

Every placement on nutreeai.com uses `utm_source=nutree_website&utm_medium=owned` and changes
only `utm_content`.

| Placement | `utm_content` | Vietnamese link |
| --- | --- | --- |
| Home hero CTA | `home_hero` | `https://quiz.nutreeai.com/survey/vi/?utm_source=nutree_website&utm_medium=owned&utm_content=home_hero` |
| Navigation CTA | `nav_cta` | `https://quiz.nutreeai.com/survey/vi/?utm_source=nutree_website&utm_medium=owned&utm_content=nav_cta` |
| Features section CTA | `features_cta` | `https://quiz.nutreeai.com/survey/vi/?utm_source=nutree_website&utm_medium=owned&utm_content=features_cta` |
| Pricing page CTA | `pricing_cta` | `https://quiz.nutreeai.com/survey/vi/?utm_source=nutree_website&utm_medium=owned&utm_content=pricing_cta` |
| Footer CTA | `footer_cta` | `https://quiz.nutreeai.com/survey/vi/?utm_source=nutree_website&utm_medium=owned&utm_content=footer_cta` |
| Blog inline CTA | `blog_inline` | `https://quiz.nutreeai.com/survey/vi/?utm_source=nutree_website&utm_medium=owned&utm_content=blog_inline` |

For the English site replace `/survey/vi/` with `/survey/en/`. For a geo-detected locale use
`https://quiz.nutreeai.com/?utm_source=nutree_website&utm_medium=owned&utm_content=home_hero`.

Other channels, with the platform macros filled in at serve time:

```
Meta Ads      https://quiz.nutreeai.com/survey/vi/?utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
TikTok Ads    https://quiz.nutreeai.com/survey/vi/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=__CAMPAIGN_NAME__&utm_content=__CID_NAME__
Google Ads    https://quiz.nutreeai.com/survey/en/?utm_source=google&utm_medium=paid_search&utm_campaign=brand_search&utm_term={keyword}&utm_id={campaignid}
Newsletter    https://quiz.nutreeai.com/survey/vi/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_tips&utm_content=cta_top
In-app share  https://quiz.nutreeai.com/?utm_source=app&utm_medium=referral&utm_content=share_sheet
```

## What the funnel does with a link

1. Server redirects (`/`, legacy routes, trailing slash) forward the query string instead of
   dropping it. See `src/lib/funnel/survey-path.ts`.
2. On the survey page, `captureAttribution()` stores the UTMs and click IDs in
   `sessionStorage` under `nutree_attribution_v1`. UTMs are first-touch for the tab; click IDs
   are last-touch. See `src/lib/analytics/attribution.ts`.
3. The URL keeps its attribution parameters. Only non-attribution parameters are removed, so
   GA4, TikTok, and Airbridge still read the campaign when their scripts load. The Meta pixel
   loads before hydration and gets the full landing URL either way.
4. Every funnel event (`funnel_step_viewed`, `email_captured`, `revenuecat_checkout_started`,
   `revenuecat_checkout_completed`, ...) carries the stored attribution as event parameters to
   GA4 and TikTok. See `src/lib/analytics/track.ts`.
5. Right before checkout, the attribution is written to the RevenueCat customer. Reserved
   attributes: `$mediaSource` from `utm_source`, `$campaign` from `utm_campaign`, `$ad` from
   `utm_content`, `$keyword` from `utm_term`. The raw `utm_*` values and click IDs are stored as
   custom attributes. Purchases, the `subscriber_attributes` block of RevenueCat webhooks, and
   Charts filters all carry the source. See `src/lib/revenuecat/attribution-attributes.ts`.

Where the data shows up:

| Tool | Where to look |
| --- | --- |
| GA4 | Reports → Acquisition → Traffic acquisition (session source / medium / campaign). Event parameters `utm_*` need custom dimensions to appear in reports. |
| Meta | Events Manager → Pixel → PageView and standard events carry the landing URL. |
| TikTok | Events Manager → Pixel → page events carry the landing URL. |
| Airbridge | Web touchpoints on the install/open journey. |
| RevenueCat | Customer → Attributes, and Charts filtered by Media source or Campaign. |

Attribution lives in the browser tab. Closing the tab and reopening the funnel without the link
starts a session with no attribution.

The lead saved to the backend (`/api/web-funnel/leads`) does not include attribution; the backend
request schema rejects unknown fields. Adding an attribution field there is a backend change.

## Verify a link

1. Open the link in a private window.
2. After the page renders, the address bar still shows the `utm_*` parameters.
3. DevTools → Application → Session Storage → `nutree_attribution_v1` holds the values.
4. With the Google Analytics Debugger extension enabled, GA4 DebugView shows
   `funnel_step_viewed` with `utm_source`, `utm_medium`, and `utm_content` parameters.
5. After a sandbox checkout, the RevenueCat customer page lists `$mediaSource` and the
   `utm_*` attributes.
