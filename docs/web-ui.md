# Web UI Guide

This document summarizes the current FastAPI + Svelte web interface, with emphasis on the settings surfaces and current UI behavior.

## Dashboard

The dashboard is optimized for quick scanning rather than exhaustive review.

- Top species can toggle between today's counts and all-time counts
- A compact hourly activity chart shows today's detection rhythm with species breakdowns in tooltips
- New species for the day are pinned into the latest-detections grouping so they remain visible even if they are not the newest raw detection
- Latest detections are grouped by species to reduce duplicate-card clutter; each group links into the filtered Review flow for the species/date context
- Live audio remains available from the `Explore more` area with authenticated short-lived stream URLs

## Settings Surfaces

### Main Settings

The main Settings page covers the core application and analysis configuration:

- Site name and station location
- Display language
- Color scheme
- Update channel
- Info-site selection
- Image provider selection
- Flickr API key state and Flickr email filtering
- Model and species-range preview controls
- BirdWeather ID
- Notifications

The notifications section supports:

- Apprise destination configuration
- Notification title and body templates
- Per-event notification toggles
- Per-species notification throttling
- Include/exclude species filters
- Test notification sending

### Advanced Settings

The Advanced Settings page groups the more operational controls:

- Disk/privacy/retention settings
- Audio capture settings
- RTSP and livestream settings
- BirdNET-Pi URL and password updates
- Frequency-shift controls
- Service log levels

`Extraction Length` can be cleared back to an empty value from the UI.

### System Settings

The System page includes:

- Software update status and apply flow
- Service status plus start/stop/restart and enable/disable controls
- Backup and restore
- Reboot
- Shutdown
- Clear-all-data
- Timezone
- NTP enable/disable
- Manual date and time entry when NTP is disabled

### Live Logs

The dedicated Live Logs page provides authenticated service log access for the supported services exposed by the backend allowlist.

- Access remains admin-authenticated
- The page is intended for quick operational inspection, not long-term log retention
- Service choices are now aligned with the backend service names

## Reports

The modern UI now includes a Weekly Report at `/reports/weekly`.

- It defaults to the most recently completed week
- It shows total detections and species deltas versus the prior week
- It highlights top species and first-seen species for the week
- The weekly report notification setting links into this surface

eBird export remains available from the Insights/history workflow.

## File Manager

The File Manager lives at `/files` and is linked from Library.

- It is admin-authenticated
- It is intentionally separate from the main Library browsing flow
- It exposes only BirdNET-owned logical roots:
  - `recordings`
  - `shifted`
  - `charts`
  - `raw`
- The first release scope is conservative:
  - browse directories
  - download files
  - delete files
  - delete empty directories

This is intentionally not a general-purpose filesystem browser.

## Live Audio

Live audio is available from the dashboard in the `Explore more` card.

- Access remains authenticated
- The dashboard requests a short-lived signed stream URL before rendering the player
- The player is intended to be easier to reach than burying live audio under settings pages

## Spectrogram Behavior

Spectrogram cards now behave differently depending on context:

- Dashboard cards stay compact and do not offer an expand affordance
- Review and species-detail cards show compact spectrogram thumbnails by default and expand in place into a recording inspector
- Library cards keep a compact thumbnail by default and use the same inspector when expanded

Expanded spectrograms intentionally grow within the normal page flow and push surrounding content down, rather than opening a modal.

The inspector shares the existing audio player. A moving playhead follows playback; tap the plot to seek, or use Left/Right arrows for 0.1-second steps and Home/End for the recording boundaries. `Select Passage` enables dragging a time range. Accessible start/end sliders refine the passage; `Play Passage` plays it once, `Repeat` loops it, and `Clear` restores normal playback. Collapsing the inspector stops passage-repeat behavior.

Interactive plots are generated on demand from the original audio using SoX, resampled to 24 kHz, with a displayed frequency range of 0–12 kHz. The `/api/media/spectrogram/{date}/{species}/{filename}?plot=true` response contains only the plot; the browser renders time and frequency labels separately. This avoids mapping axes, embedded text, or letterboxing to recording time. The plot is cached beside the recording, invalidated when the audio is newer, and rendered through a synchronous worker route with a 15-second timeout and one active render per backend worker. An unavailable plot falls back to the saved PNG with ordinary playback and a Retry option.

This is a playback-linked saved-recording view. The image pixels do not change with audio filters or gain, and it does not provide higher-resolution spectral zoom or a live-stream waterfall.

## Insights Species Focus

- Selecting a species charts its own detection counts by default, using a zero-based scale fitted to the selected counts. Multiple selections use grouped bars.
- `Show All` adds a stacked `Other` series for station-wide context; `Show Selected` returns to focus. Summary totals and peak periods continue to describe the selected species.
- Species selections survive date and range-mode changes, including Year view. A selected species absent from the next period remains selected with zero counts.
- Search accepts common or scientific names and covers every species detected in the current period, including species outside the top ten. The list expands with `Show all` / `Show less`.
- Station distribution is secondary and collapses while species are selected. Its percentages include all detections, including species outside the displayed leaders.
- Days with no indexed detections occupy their own calendar positions. A zero count does not establish that recording was active throughout that day.
- Selecting a species bar opens that species' Review queue for the bucket date; selecting `Other` opens the station's queue for that date. Year bars open Review on the first day of the clicked month, preserving an individual species filter when applicable.

## Temporal Zoom

Recording players include Temporal Zoom presets for slowing playback while preserving pitch.

- The modes are intended to give human listeners more room to notice fast notes, gaps, trills, syllable transitions, and subtle differences
- Presets are `Human` (`1.0x`), `Field` (`0.85x`), `Bird detail` (`0.7x`), `Fast bird` (`0.6x`), and `Fine` (`0.5x`)
- Expanded spectrogram/detail views surface Temporal Zoom directly; other players include it in the expanded audio controls
- Presets explicitly request browser pitch preservation so slowed recordings do not turn into novelty slow-motion audio
- Mobile browsers use a lighter native playback path and avoid WebAudio filters during Temporal Zoom
- Mobile views can prepare cached Temporal Zoom audio in the background when controls are opened; the prepare endpoint queues work and returns quickly so remote access paths such as Cloudflare Tunnel are not blocked on audio rendering
- Cached Temporal Zoom clips live under the recordings `By_Date/tempo/{rate}x/...` cache tree and are rendered with `sox tempo` when available, falling back to `ffmpeg atempo`
- Spectrogram playhead and passage coordinates stay in original-recording seconds. Cached slowed audio uses measured duration ratios to map those coordinates; changing sources preserves the passage and playhead. A delayed source load respects a newer playback choice.
- Reference labels are inspired by visual temporal-resolution research, including critical flicker fusion studies, and are not presented as simulations of another animal's hearing
- The in-player reference link points to Healy et al. 2013, `Metabolic rate and body size are linked with perception of temporal information`
- Natural playback remains the default

## Species Views

The Species page supports broad and date-scoped browsing.

- `All time` remains the default complete species list
- `Today` shows species detected on the current local date
- `Pick date` uses the available detection dates and updates the URL as `/species?date=YYYY-MM-DD`
- Search and sort controls apply within the active time range
- Dashboard links can deep-link directly to `/species?date=today`

Species cards use the shared image component, which lazy-loads bird images near the viewport and reuses in-memory requests across repeated species cards.

## Public URL and Tunnel Guidance

The `BirdNET-Pi URL` setting is only appropriate when BirdNET-Pi is serving the public hostname directly.

When BirdNET-Pi sits behind Cloudflare Tunnel or another proxy/tunnel that already terminates TLS or owns redirect behavior:

- Leave `BirdNET-Pi URL` blank
- Do not set it to the public `https://...` URL

Setting the public URL while using a tunnel can create redirect loops at the edge.

## Operational Note

Changes to the public URL and Caddy password now trigger Caddyfile regeneration through the FastAPI config path, so the active web-server configuration stays in sync with `birdnet.conf`.
