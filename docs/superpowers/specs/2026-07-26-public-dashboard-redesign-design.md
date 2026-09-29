# Public Dashboard Redesign Design

Date: 2026-07-26

## Summary

Redesign the public-facing BirdNET-Pibird experience around a "Live Field Window" dashboard: the first screen should answer "what is singing right now?" for curious neighbors and general visitors, while keeping daily context and routes into deeper science available for birders and ornithologists.

The first implementation pass focuses on public-facing routes and reusable public components. Admin/settings surfaces are out of scope except for shared styles that public components already depend on.

## Goals

- Make the dashboard more eye-catching, intuitive, and alive without making it feel like a marketing site.
- Preserve a scientific-tool appearance through species names, confidence, spectrograms, activity data, and clear station context.
- Keep the app snappy on a Raspberry Pi 3B+ with 4 GB RAM.
- Give curious visitors a friendly first impression while providing easy paths to Species, Insights, Review, and Library.
- Avoid privacy regressions. Live audio remains authenticated in this pass.

## Non-Goals

- Do not redesign admin, settings, live logs, file manager, or system-management workflows in this pass.
- Do not add a public live-audio mode in this pass.
- Do not add heavy animation, video, background media, realtime sockets, or extra large client dependencies.
- Do not turn quiet detection periods into public alerts or operational warnings.

## Audience And Tone

Primary audience: curious neighbors and general public visitors who want to know what is happening outside right now.

Secondary audience: serious birders, ornithologists, and maintainers who want to inspect species, confidence, activity rhythm, recordings, and history.

Tone: lively backyard observatory. The interface should feel warm and active, but still credible. It should foreground real station data, bird imagery, spectrograms, and scientific names rather than decorative graphics.

## Public Route Scope

Primary scope:

- `/` dashboard
- Public entry points to `/species`
- Public entry points to `/history`
- Public entry points to `/detections`
- Public entry points to `/recordings`
- Shared public components used by those routes, especially detection cards, species images, metric summaries, and navigation affordances

Out of scope for this pass:

- `/settings`
- `/settings/advanced`
- `/settings/system`
- `/live-logs`
- `/files`
- Authentication flows beyond preserving the existing live-audio authentication behavior

## Dashboard Design

The dashboard should be reorganized around three layers:

1. Live Field Window
2. Today at a Glance
3. Deeper Exploration

### Live Field Window

The first major dashboard element should feature the latest meaningful detection:

- Common name as the primary title
- Scientific name directly beneath it
- Confidence and recency visible without interaction
- Species image, using the existing lazy-loaded cached image component
- Compact spectrogram strip, using the existing generated spectrogram image
- Link affordances to open the species page and review recording
- "First station record" badge when the latest species is first-ever for the station

This replaces the current first impression of separate stat cards plus later detection cards. It should make the station feel live immediately while preserving the existing scientific data signals.

### Today At A Glance

The dashboard should include compact journal-style metrics near the live card:

- Detections today
- Species today
- All-time detections
- All-time station species
- First station records today, when present

These metrics should support the live card rather than competing with it. On mobile, they should appear after the live card and activity strip.

### Slim Activity Strip

Add a slim 24-hour activity strip to give a broader window into the day's detection rhythm.

Requirements:

- Use the existing hourly bucket data already loaded for the dashboard.
- Represent all 24 hours as stable-width segments.
- Use height or tone to show relative activity.
- Use a subtle zero-detection treatment, such as empty or dashed segments.
- Label time anchors lightly, such as 12a, 6a, 12p, 6p, and now.
- Keep the strip visually compact; full charting remains in Insights.
- Avoid public alarm language such as "outage", "failure", "warning", or "problem".

The strip is observational. It helps visitors understand the daily rhythm and lets maintainers visually notice unusual gaps, but automated gap detection belongs in a later admin/status review.

### Discovery-Aware First Station Records

The current "New Species Today" concept is bursty: new stations may see many first-ever species, while mature stations may see none for long periods. Treat first station records as an adaptive state rather than a fixed large card.

Behavior:

- Add a small "First station record" badge on live/recent cards when applicable.
- Include the count in Today at a Glance when greater than zero.
- Show a compact "Discovery note" only when first station records exist.
- For 1 to 3 records, show species chips.
- For 4 or more records, show count plus the top 3 chips and a "View all" link.
- For 0 records, omit the discovery note entirely.

Preferred labels:

- "First station record" for badges
- "Discovery note" for the adaptive card
- "First station records" for counts and links

Avoid the label "New today" as the primary language because it is less clear than "first station record".

### Deeper Exploration

The dashboard should retain clear routes into deeper workflows:

- Open Review for recent detections and first station records
- Open Species for browsing station species
- Open Insights for charts and trend analysis
- Open Library for recordings and spectrogram inspection
- Listen Live remains authenticated and secondary

The public dashboard should not become a full science console. It should provide enough evidence to invite exploration, then let deeper pages carry the heavier analysis.

## Mobile Design

Mobile should use a single-column story:

1. Station header and status
2. Live Field Window
3. Slim 24-hour activity strip
4. Today at a Glance
5. Discovery note, only when applicable
6. Recent species and exploration links

Mobile constraints:

- Avoid horizontal scrolling.
- Keep fixed-format elements stable with explicit dimensions.
- Keep the activity strip slim and tappable only if it links to Insights; it does not need individual hourly tap targets in the first pass.
- Keep labels short enough to fit narrow screens.
- Preserve the existing bottom navigation pattern.

## Visual System Direction

Use a richer but restrained palette:

- Continue the green station identity, but avoid an all-green page.
- Add warm discovery accents for first station records.
- Let spectrogram colors provide natural visual energy.
- Use white or lightly tinted surfaces for readability.
- Keep dark mode compatible with the current theme.

Shape and spacing:

- Cards should remain modestly rounded, around the existing 8px radius unless a component already uses a nearby value.
- Avoid nested decorative cards.
- Use full-width sections and well-bounded repeated items.
- Keep typography tighter in compact panels and larger only for the live detection title.

## Data Flow

The first pass should reuse current public API calls where possible:

- `detections.stats()` for dashboard totals and first station record count
- `detections.today({ limit })` for recent detections
- `detections.newSpeciesToday()` for first station record detection data
- `detections.chartDataRange({ start, end, group_by: "hour" })` for the activity strip
- `health.info()` for station identity
- `system.publicStatus()` for public service status
- existing media URL helpers for audio, spectrograms, and species images

The dashboard can merge `detections.today()` and `detections.newSpeciesToday()` as it does today, using the first-station-record set to pin or badge relevant species.

No new backend endpoint is required for the first design pass unless implementation reveals that the current "latest detection" selection is too expensive or awkward to derive from existing data.

## Error, Empty, And Loading States

Loading:

- Keep initial loading lightweight.
- Prefer skeleton-like reserved areas or compact spinners that do not shift layout.

No detections today:

- The Live Field Window should become a calm empty state such as "Listening for today's first detection."
- The activity strip can show empty 24-hour segments.
- Today at a Glance should still show all-time station species and all-time detections.

No first station records:

- Omit the Discovery note.
- Do not show an empty "New" card.

Live audio unauthenticated:

- Keep the current authenticated flow.
- Do not expose public stream controls in this pass.

API failure:

- Keep existing toast behavior.
- Preserve a useful static page shell with station identity and status where available.

## Performance Guardrails

The design must stay friendly to Raspberry Pi 3B+ deployment:

- Reuse existing public data calls and media URLs.
- Keep the existing visible-tab refresh pattern around 60 seconds.
- Do not add realtime socket updates in this pass.
- Do not add heavy animation or visual libraries.
- Continue lazy-loading species images.
- Use CSS layout and simple DOM elements for the activity strip rather than Chart.js if practical.
- Keep Chart.js for deeper Insights where full charts already exist.
- Avoid large new assets. Use real species images and existing spectrograms as the primary visual interest.

## Accessibility

- Maintain semantic headings with a clear dashboard hierarchy.
- Ensure live/status indicators also have text, not color alone.
- Keep first-station-record badges readable in light and dark mode.
- Preserve keyboard access for links and controls.
- Respect reduced-motion preferences.
- Provide meaningful alt text for species images and spectrograms.

## Testing And Verification

Design implementation should be verified with:

- `npm run check` in `frontend`
- `npm run build` in `frontend`
- Manual or Playwright screenshot checks at mobile and desktop widths
- Dashboard empty-state review with no detections today
- Dashboard populated-state review with first station records
- Dashboard populated-state review with no first station records
- Dark mode review

## Follow-Up Admin And Configuration Notes

Save these for the dedicated admin review:

- Public live-audio toggle for deployments in public locations such as reserves or nature centers.
- Default public live audio to off.
- When off, keep authenticated live audio only.
- When on, provide a privacy-conscious public listening flow with clear station labeling.
- Configurable quiet-window or gap-monitoring rules, if maintainers later want operational alerts.
- Admin/status UX for detection gaps should account for normal overnight quiet and seasonal variation.

## Acceptance Criteria

- The dashboard first screen clearly answers "what is singing right now?"
- Daily and all-time context remain visible without dominating the page.
- First station records are highlighted without startup clutter or mature-station empty boxes.
- The slim activity strip shows daily rhythm without alarm language.
- Mobile presents the same story in a clear single-column order.
- Live audio remains authenticated.
- Public pages remain fast on Raspberry Pi 3B+ hardware.
