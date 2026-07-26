# Public Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved public dashboard refresh: live field window, slim activity strip, adaptive first-station-record discovery treatment, mobile-friendly layout, and no public gap-warning noise.

**Architecture:** Keep the redesign frontend-only for this pass. Extract small pure dashboard helpers for activity-strip normalization and discovery previews, add dashboard-specific Svelte components, then recompose `frontend/src/routes/+page.svelte` around those components while preserving existing API calls and authenticated live audio behavior.

**Tech Stack:** Svelte 5, SvelteKit static adapter, TypeScript, Tailwind CSS, existing FastAPI endpoints, existing species image and media helpers.

## Global Constraints

- Keep the app snappy on a Raspberry Pi 3B+ with 4 GB RAM.
- Do not redesign admin, settings, live logs, file manager, or system-management workflows in this pass.
- Do not add a public live-audio mode in this pass.
- Do not add heavy animation, video, background media, realtime sockets, or extra large client dependencies.
- Do not turn quiet detection periods into public alerts or operational warnings.
- Live audio remains authenticated in this pass.
- Use the existing visible-tab refresh pattern around 60 seconds.
- Use CSS layout and simple DOM elements for the activity strip rather than Chart.js if practical.
- Keep Chart.js for deeper Insights where full charts already exist.
- Continue lazy-loading species images.

---

## File Structure

- Create `frontend/src/lib/dashboard.ts`
  - Pure helper functions and small types for dashboard-only presentation logic.
  - Produces 24 fixed activity segments, discovery preview metadata, first-station-record checks, dashboard recency labels, and latest-detection selection.

- Create `frontend/src/lib/components/ActivityStrip.svelte`
  - Slim 24-hour activity strip rendered with simple DOM/CSS, not Chart.js.
  - Consumes normalized segments from `frontend/src/lib/dashboard.ts`.

- Create `frontend/src/lib/components/LiveFieldWindow.svelte`
  - Public dashboard hero card for the latest detection or a calm listening empty state.
  - Uses `SpeciesImage`, existing media helpers, and activity strip slot/child composition.

- Create `frontend/src/lib/components/DashboardSummary.svelte`
  - Compact Today at a Glance metric panel.
  - Shows detections today, species today, all-time detections, all-time species, and first station records when present.

- Create `frontend/src/lib/components/DiscoveryNote.svelte`
  - Adaptive first-station-record note.
  - Hidden when there are zero first station records, chips for one to three, top three plus View all for four or more.

- Modify `frontend/src/lib/components/DetectionCard.svelte`
  - Update public badge label usage to work with `First station record`.
  - Keep existing generic `tagLabel` prop so other routes remain stable.

- Modify `frontend/src/lib/components/index.ts`
  - Export new dashboard components.

- Modify `frontend/src/routes/+page.svelte`
  - Remove dashboard Chart.js dependency and canvas chart code.
  - Continue loading current public API data.
  - Derive latest live detection separately from pinned recent groups.
  - Recompose the page in mobile-first order.
  - Preserve authenticated live audio flow.

---

### Task 1: Dashboard Presentation Helpers

**Files:**
- Create: `frontend/src/lib/dashboard.ts`
- Verify: `frontend/src/lib/dashboard.ts`

**Interfaces:**
- Consumes: `Detection`, `RangeChartData` from `$lib/api`
- Produces:
  - `ActivitySegment`
  - `DiscoveryPreview`
  - `buildActivitySegments(hourlyData: RangeChartData | null): ActivitySegment[]`
  - `detectionTimestamp(detection: Detection): number`
  - `latestDetection(items: Detection[]): Detection | null`
  - `isFirstStationRecord(sciName: string, firstStationRecordSet: Set<string>): boolean`
  - `buildDiscoveryPreview(detections: Detection[], maxVisible?: number): DiscoveryPreview`
  - `formatDetectionClock(time: string): string`
  - `formatRecencyLabel(detection: Detection | null, now?: Date): string`

- [ ] **Step 1: Add the helper module**

Create `frontend/src/lib/dashboard.ts` with this implementation:

```ts
import type { Detection, RangeChartData } from '$lib/api';

export interface ActivitySegment {
	hour: number;
	count: number;
	intensity: number;
	isPeak: boolean;
	label: string;
	title: string;
}

export interface DiscoveryPreview {
	total: number;
	visible: Detection[];
	hiddenCount: number;
	reviewHref: string;
}

function hourLabel(hour: number): string {
	if (hour === 0) return '12a';
	if (hour === 6) return '6a';
	if (hour === 12) return '12p';
	if (hour === 18) return '6p';
	return '';
}

export function buildActivitySegments(hourlyData: RangeChartData | null): ActivitySegment[] {
	const counts = new Array(24).fill(0) as number[];

	for (const bucket of hourlyData?.buckets ?? []) {
		const hour = typeof bucket.period === 'number' ? bucket.period : Number(bucket.period);
		if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
			counts[hour] = bucket.count;
		}
	}

	const max = Math.max(...counts, 0);
	const peakHour = max > 0 ? counts.indexOf(max) : -1;

	return counts.map((count, hour) => ({
		hour,
		count,
		intensity: max > 0 ? count / max : 0,
		isPeak: hour === peakHour,
		label: hourLabel(hour),
		title: `${hour}:00 - ${count} ${count === 1 ? 'detection' : 'detections'}`,
	}));
}

export function detectionTimestamp(detection: Detection): number {
	return new Date(`${detection.Date}T${detection.Time}`).getTime();
}

export function latestDetection(items: Detection[]): Detection | null {
	if (items.length === 0) return null;
	return [...items].sort((a, b) => detectionTimestamp(b) - detectionTimestamp(a))[0];
}

export function isFirstStationRecord(sciName: string, firstStationRecordSet: Set<string>): boolean {
	return firstStationRecordSet.has(sciName);
}

export function buildDiscoveryPreview(detections: Detection[], maxVisible = 3): DiscoveryPreview {
	const visible = detections.slice(0, maxVisible);
	const hiddenCount = Math.max(0, detections.length - visible.length);
	const params = new URLSearchParams({
		date: todayStr(),
		new_on_date: 'true',
	});

	return {
		total: detections.length,
		visible,
		hiddenCount,
		reviewHref: `/detections?${params.toString()}`,
	};
}

export function formatDetectionClock(time: string): string {
	return time.slice(0, 5);
}

export function formatRecencyLabel(detection: Detection | null, now = new Date()): string {
	if (!detection) return '';
	const timestamp = detectionTimestamp(detection);
	if (!Number.isFinite(timestamp)) return `${detection.Date} ${formatDetectionClock(detection.Time)}`;

	const diffMs = now.getTime() - timestamp;
	if (diffMs < 0) return formatDetectionClock(detection.Time);

	const diffMinutes = Math.floor(diffMs / 60000);
	if (diffMinutes < 1) return 'just now';
	if (diffMinutes < 60) return `${diffMinutes} min ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} hr ago`;

	return `${detection.Date} ${formatDetectionClock(detection.Time)}`;
}

function todayStr(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Run frontend type check**

Run: `cd frontend && npm run check`

Expected: PASS. If it fails because `RangeChartData` bucket fields differ from the assumed interface, inspect the existing interface in `frontend/src/lib/api.ts`, update the helper accordingly, and rerun the full command.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/dashboard.ts
git commit -m "feat(frontend): add dashboard presentation helpers"
```

---

### Task 2: Slim Activity Strip Component

**Files:**
- Create: `frontend/src/lib/components/ActivityStrip.svelte`
- Modify: `frontend/src/lib/components/index.ts`

**Interfaces:**
- Consumes: `ActivitySegment[]` from `buildActivitySegments`
- Produces: `<ActivityStrip segments={activitySegments} href="/history?mode=day&date=YYYY-MM-DD" />`

- [ ] **Step 1: Create the component**

Create `frontend/src/lib/components/ActivityStrip.svelte`:

```svelte
<script lang="ts">
	import type { ActivitySegment } from '$lib/dashboard';

	export let segments: ActivitySegment[] = [];
	export let href = '/history';

	function heightFor(segment: ActivitySegment): string {
		if (segment.count === 0) return '0.125rem';
		return `${Math.max(0.35, segment.intensity) * 2rem}`;
	}
</script>

<a
	href={href}
	class="block rounded-lg border border-gray-200/80 bg-white/70 p-3 transition-colors hover:border-primary-200 hover:bg-white dark:border-dark-border/80 dark:bg-dark-nav/40 dark:hover:border-primary-900"
	aria-label="Open today's activity in Insights"
>
	<div class="mb-2 flex items-center justify-between gap-3">
		<div>
			<p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Today at a glance</p>
			<p class="text-xs text-gray-500 dark:text-gray-400">24-hour detection rhythm</p>
		</div>
		<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Insights</span>
	</div>
	<div class="grid h-9 grid-cols-24 items-end gap-0.5" aria-hidden="true">
		{#each segments as segment (segment.hour)}
			<span
				class="block rounded-sm {segment.count === 0
					? 'border-t-2 border-dashed border-gray-300 bg-transparent dark:border-gray-600'
					: segment.isPeak
						? 'bg-amber-500 dark:bg-amber-400'
						: 'bg-primary-500/70 dark:bg-primary-400/70'}"
				style:height={heightFor(segment)}
				title={segment.title}
			></span>
		{/each}
	</div>
	<div class="mt-1 grid grid-cols-5 text-[10px] text-gray-400 dark:text-gray-500">
		<span>12a</span>
		<span class="text-center">6a</span>
		<span class="text-center">12p</span>
		<span class="text-center">6p</span>
		<span class="text-right">now</span>
	</div>
</a>
```

- [ ] **Step 2: Add grid column utility**

If Tailwind does not generate `grid-cols-24`, modify `frontend/tailwind.config.js`:

```js
extend: {
	gridTemplateColumns: {
		24: 'repeat(24, minmax(0, 1fr))',
	},
	colors: {
```

Keep the existing `colors` block intact.

- [ ] **Step 3: Export the component**

Modify `frontend/src/lib/components/index.ts` to include:

```ts
export { default as ActivityStrip } from './ActivityStrip.svelte';
```

- [ ] **Step 4: Run frontend type check**

Run: `cd frontend && npm run check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/ActivityStrip.svelte frontend/src/lib/components/index.ts frontend/tailwind.config.js
git commit -m "feat(frontend): add dashboard activity strip"
```

---

### Task 3: Live Field Window Component

**Files:**
- Create: `frontend/src/lib/components/LiveFieldWindow.svelte`
- Modify: `frontend/src/lib/components/index.ts`

**Interfaces:**
- Consumes:
  - `detection: Detection | null`
  - `firstStationRecord: boolean`
  - `activitySegments: ActivitySegment[]`
  - `activityHref: string`
- Produces: live dashboard hero with empty state and embedded `ActivityStrip`

- [ ] **Step 1: Create the component**

Create `frontend/src/lib/components/LiveFieldWindow.svelte`:

```svelte
<script lang="ts">
	import type { ActivitySegment } from '$lib/dashboard';
	import { formatDetectionClock, formatRecencyLabel } from '$lib/dashboard';
	import { media, type Detection } from '$lib/api';
	import ActivityStrip from './ActivityStrip.svelte';
	import SpeciesImage from './SpeciesImage.svelte';

	export let detection: Detection | null = null;
	export let firstStationRecord = false;
	export let activitySegments: ActivitySegment[] = [];
	export let activityHref = '/history';

	$: audioContextHref = detection
		? `/detections?date=${encodeURIComponent(detection.Date)}&species=${encodeURIComponent(detection.Sci_Name)}`
		: '/detections';
	$: speciesHref = detection ? `/species/${encodeURIComponent(detection.Sci_Name)}` : '/species';
	$: spectrogramUrl = detection
		? media.spectrogramUrl(detection.Date, detection.Sci_Name, detection.File_Name)
		: '';
</script>

<section class="card border-primary-100 bg-white/95 p-4 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-5">
	<div class="mb-4 flex items-center justify-between gap-3">
		<div>
			<p class="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">Singing now</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">Live station detections refresh while this tab is visible</p>
		</div>
		<span class="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
			<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
			Live
		</span>
	</div>

	{#if detection}
		<div class="grid gap-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
			<a href={speciesHref} class="h-24 w-24 overflow-hidden rounded-lg bg-gray-200 ring-1 ring-gray-200 dark:bg-dark-border dark:ring-dark-border">
				<SpeciesImage sciName={detection.Sci_Name} size="sm" />
			</a>

			<div class="min-w-0">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0">
						<a href={speciesHref} class="block text-2xl font-bold leading-tight text-gray-950 hover:underline dark:text-gray-50">
							{detection.Com_Name}
						</a>
						<p class="mt-1 truncate text-sm italic text-gray-500 dark:text-gray-400">{detection.Sci_Name}</p>
					</div>
					<div class="flex flex-wrap items-center gap-2 sm:justify-end">
						<span class="metric-pill-primary py-1 font-semibold">{(detection.Confidence * 100).toFixed(0)}%</span>
						{#if firstStationRecord}
							<span class="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800/70 dark:bg-amber-900/25 dark:text-amber-200">
								First station record
							</span>
						{/if}
					</div>
				</div>

				<div class="mt-3 overflow-hidden rounded-lg bg-gray-200 dark:bg-dark-border">
					<img
						src={spectrogramUrl}
						alt="Spectrogram for {detection.Com_Name}"
						class="h-20 w-full object-cover"
						loading="lazy"
					/>
				</div>

				<div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
					<span class="metric-pill">{formatRecencyLabel(detection)}</span>
					<span class="metric-pill">{formatDetectionClock(detection.Time)}</span>
					<a href={speciesHref} class="metric-pill hover:text-primary-700 hover:underline dark:hover:text-primary-300">Open species</a>
					<a href={audioContextHref} class="metric-pill hover:text-primary-700 hover:underline dark:hover:text-primary-300">Review recording</a>
				</div>
			</div>
		</div>
	{:else}
		<div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-dark-border dark:bg-dark-nav/40">
			<p class="font-semibold text-gray-900 dark:text-gray-100">Listening for today's first detection</p>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Recent species and recordings will appear as birds are identified.</p>
		</div>
	{/if}

	<div class="mt-4">
		<ActivityStrip segments={activitySegments} href={activityHref} />
	</div>
</section>
```

- [ ] **Step 2: Export the component**

Add to `frontend/src/lib/components/index.ts`:

```ts
export { default as LiveFieldWindow } from './LiveFieldWindow.svelte';
```

- [ ] **Step 3: Run frontend type check**

Run: `cd frontend && npm run check`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/components/LiveFieldWindow.svelte frontend/src/lib/components/index.ts
git commit -m "feat(frontend): add live field dashboard card"
```

---

### Task 4: Summary And Discovery Components

**Files:**
- Create: `frontend/src/lib/components/DashboardSummary.svelte`
- Create: `frontend/src/lib/components/DiscoveryNote.svelte`
- Modify: `frontend/src/lib/components/index.ts`

**Interfaces:**
- Consumes:
  - `stats: DetectionStats | null`
  - `discovery: DiscoveryPreview`
- Produces:
  - `<DashboardSummary {stats} />`
  - `<DiscoveryNote discovery={discoveryPreview} />`

- [ ] **Step 1: Create dashboard summary**

Create `frontend/src/lib/components/DashboardSummary.svelte`:

```svelte
<script lang="ts">
	import type { DetectionStats } from '$lib/api';

	export let stats: DetectionStats | null = null;

	const metrics = [
		{ label: 'Detections today', value: () => stats?.todays_count ?? 0, href: '/history?mode=day' },
		{ label: 'Species today', value: () => stats?.todays_species_tally ?? 0, href: '/species?date=today' },
		{ label: 'All-time detections', value: () => stats?.total_count ?? 0, href: '/history' },
		{ label: 'Station species', value: () => stats?.species_tally ?? 0, href: '/species' },
	];
</script>

<section class="card p-4 sm:p-5">
	<div class="mb-3">
		<p class="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">Today's chorus</p>
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Station summary</h2>
	</div>
	<div class="grid grid-cols-2 gap-3">
		{#each metrics as metric}
			<a href={metric.href} class="rounded-lg border border-gray-200/80 bg-gray-50 p-3 transition-colors hover:border-primary-200 hover:bg-white dark:border-dark-border/80 dark:bg-dark-nav/50 dark:hover:border-primary-900">
				<p class="text-2xl font-bold leading-tight text-gray-950 dark:text-gray-50">{metric.value()}</p>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
			</a>
		{/each}
	</div>
	{#if (stats?.new_species_today ?? 0) > 0}
		<a href="/detections?date={new Date().toISOString().slice(0, 10)}&new_on_date=true" class="mt-3 inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-900/25 dark:text-amber-200">
			{stats?.new_species_today} first station {(stats?.new_species_today ?? 0) === 1 ? 'record' : 'records'} today
		</a>
	{/if}
</section>
```

- [ ] **Step 2: Create discovery note**

Create `frontend/src/lib/components/DiscoveryNote.svelte`:

```svelte
<script lang="ts">
	import type { DiscoveryPreview } from '$lib/dashboard';

	export let discovery: DiscoveryPreview;
</script>

{#if discovery.total > 0}
	<section class="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/70 dark:bg-amber-900/20">
		<div class="flex items-start justify-between gap-3">
			<div>
				<p class="text-sm font-semibold text-amber-900 dark:text-amber-100">Discovery note</p>
				<p class="mt-1 text-xs text-amber-800/80 dark:text-amber-100/75">
					First-ever records at this station today.
				</p>
			</div>
			<a href={discovery.reviewHref} class="text-xs font-semibold text-amber-900 hover:underline dark:text-amber-100">
				View all
			</a>
		</div>
		<div class="mt-3 flex flex-wrap gap-2">
			{#each discovery.visible as detection (detection.Sci_Name)}
				<a
					href="/species/{encodeURIComponent(detection.Sci_Name)}"
					class="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-dark-card dark:text-amber-100 dark:hover:bg-amber-900/40"
				>
					{detection.Com_Name}
				</a>
			{/each}
			{#if discovery.hiddenCount > 0}
				<a href={discovery.reviewHref} class="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-dark-card dark:text-amber-100 dark:hover:bg-amber-900/40">
					+{discovery.hiddenCount} more
				</a>
			{/if}
		</div>
	</section>
{/if}
```

- [ ] **Step 3: Export components**

Add to `frontend/src/lib/components/index.ts`:

```ts
export { default as DashboardSummary } from './DashboardSummary.svelte';
export { default as DiscoveryNote } from './DiscoveryNote.svelte';
```

- [ ] **Step 4: Run frontend type check**

Run: `cd frontend && npm run check`

Expected: PASS. If Svelte rejects dynamic `href` interpolation in `DashboardSummary`, replace it with a reactive `todayHref` variable:

```ts
$: todayHref = `/detections?date=${new Date().toISOString().slice(0, 10)}&new_on_date=true`;
```

Then use `href={todayHref}` and rerun the full check.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/components/DashboardSummary.svelte frontend/src/lib/components/DiscoveryNote.svelte frontend/src/lib/components/index.ts
git commit -m "feat(frontend): add dashboard summary and discovery note"
```

---

### Task 5: Recompose Dashboard Route

**Files:**
- Modify: `frontend/src/routes/+page.svelte`

**Interfaces:**
- Consumes:
  - `buildActivitySegments(hourlyData)`
  - `latestDetection(mergedDetections)`
  - `buildDiscoveryPreview(newSpeciesTodayDetections)`
  - `isFirstStationRecord(featuredDetection.Sci_Name, newSpeciesTodaySet)`
  - `LiveFieldWindow`
  - `DashboardSummary`
  - `DiscoveryNote`
- Produces:
  - Mobile-first dashboard order matching the design spec.
  - Authenticated live audio preserved.

- [ ] **Step 1: Update imports**

Replace the dashboard component imports at the top of `frontend/src/routes/+page.svelte` with:

```ts
import { onMount, onDestroy } from 'svelte';
import { detections, health, species as speciesApi, system as systemApi, type Detection, type DetectionStats, type SpeciesSummary, type RangeChartData } from '$lib/api';
import { DashboardSummary, DetectionCard, DiscoveryNote, ExternalLinks, LiveFieldWindow, Modal } from '$lib/components';
import { buildActivitySegments, buildDiscoveryPreview, isFirstStationRecord, latestDetection as selectLatestDetection } from '$lib/dashboard';
import { auth, setSiteIdentity, siteName, toasts } from '$lib/stores';
```

Remove `tick`, `StatsCard`, and `SpeciesImage` from the route imports.

- [ ] **Step 2: Remove dashboard Chart.js state and functions**

Delete these route-level values and functions from `frontend/src/routes/+page.svelte`:

```ts
let ChartJS: typeof import('chart.js/auto').default;
let sparkCanvas: HTMLCanvasElement;
let sparkChart: any = null;
let isDark = false;
let prefersReducedMotion = false;
let themeObserver: MutationObserver;
```

Also delete the complete `detectTheme`, `getHourLabel`, and `renderSparkline` function definitions. Keep `hourlyData` because it feeds the new activity strip.

- [ ] **Step 3: Add dashboard derived values**

Add these reactive values after the existing top-species reactive block:

```ts
let featuredDetection: Detection | null = null;

$: activitySegments = buildActivitySegments(hourlyData);
$: discoveryPreview = buildDiscoveryPreview(newSpeciesTodayDetections);
$: featuredIsFirstStationRecord = featuredDetection
	? isFirstStationRecord(featuredDetection.Sci_Name, newSpeciesTodaySet)
	: false;
```

- [ ] **Step 4: Set the live featured detection during data load**

Inside `loadData()`, after `const mergedDetections = uniqueDetections([...newSpeciesData, ...detectionsData.detections]);`, add:

```ts
featuredDetection = selectLatestDetection(mergedDetections);
```

Do not use the pinned sorted group to choose the live feature; the feature answers "what is singing right now?" and should be the latest detection by timestamp.

- [ ] **Step 5: Remove Chart.js lifecycle work**

In `loadData()`, remove:

```ts
await tick();
renderSparkline();
```

In `onMount`, remove:

```ts
const module = await import('chart.js/auto');
ChartJS = module.default;
prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Remove the mutation observer setup. In `onDestroy`, remove:

```ts
if (sparkChart) sparkChart.destroy();
if (themeObserver) themeObserver.disconnect();
```

- [ ] **Step 6: Replace the top dashboard section**

Replace the current stats grid, New Species Today card, live indicator, and Today's Activity Chart blocks with:

```svelte
<div class="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
	<LiveFieldWindow
		detection={featuredDetection}
		firstStationRecord={featuredIsFirstStationRecord}
		{activitySegments}
		activityHref={insightsHref('today')}
	/>
	<div class="space-y-4">
		<DashboardSummary {stats} />
		<DiscoveryNote discovery={discoveryPreview} />
	</div>
</div>
```

- [ ] **Step 7: Update latest detections copy and badges**

In the latest detections section:

Replace heading text:

```svelte
Latest Detections
```

with:

```svelte
Recent Species
```

Replace helper copy:

```svelte
Most recent recording for each species. Repeats are summarized on the card.
```

with:

```svelte
Most recent recording for each species. First station records are highlighted.
```

Replace the detection card `tagLabel`:

```svelte
tagLabel={isPinnedNewSpecies(group.sciName) ? 'New today' : null}
```

with:

```svelte
tagLabel={isPinnedNewSpecies(group.sciName) ? 'First station record' : null}
```

- [ ] **Step 8: Keep live audio authenticated**

Do not change `openLiveAudio`, `requestLiveAudioUrl`, `handleLiveAudioLogin`, `showLiveAudioLoginModal`, or the authenticated audio player markup. Only keep it in the Explore more card as a secondary action.

- [ ] **Step 9: Run frontend type check**

Run: `cd frontend && npm run check`

Expected: PASS.

- [ ] **Step 10: Run frontend build**

Run: `cd frontend && npm run build`

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/routes/+page.svelte
git commit -m "feat(frontend): recompose public dashboard"
```

---

### Task 6: Visual QA And Mobile Tuning

**Files:**
- Modify as needed:
  - `frontend/src/routes/+page.svelte`
  - `frontend/src/lib/components/ActivityStrip.svelte`
  - `frontend/src/lib/components/LiveFieldWindow.svelte`
  - `frontend/src/lib/components/DashboardSummary.svelte`
  - `frontend/src/lib/components/DiscoveryNote.svelte`
  - `frontend/src/app.css`

**Interfaces:**
- Consumes: built dashboard from Tasks 1-5
- Produces: final responsive, polished public dashboard

- [ ] **Step 1: Start the frontend dev server**

Run: `cd frontend && npm run dev -- --host 127.0.0.1`

Expected: Vite serves the app on a local port. If port 5173 is busy, use the next available port Vite reports.

- [ ] **Step 2: Inspect desktop layout**

Open the dashboard at the Vite URL.

Check:

- Live Field Window and Today’s chorus fit in one desktop row.
- Activity strip is slim and readable.
- No public warning/alarm language appears for quiet hours.
- Discovery note only appears when first station records exist in the loaded data.
- Recent Species cards do not overlap or crowd the hero.

- [ ] **Step 3: Inspect mobile layout**

Use a mobile-width viewport around 390px wide.

Check:

- No horizontal scrolling.
- Order is Live Field Window, activity strip, Today’s chorus, Discovery note, Recent Species, Explore more.
- Bird name, scientific name, confidence, badges, and action chips fit without overlapping.
- Activity strip labels do not collide.
- Bottom navigation does not cover content.

- [ ] **Step 4: Inspect dark mode**

Toggle dark mode.

Check:

- Activity strip bars, dashed zero segments, and discovery badges are visible.
- Spectrogram and species image remain legible.
- Links and chips have sufficient contrast.

- [ ] **Step 5: Run final verification**

Run:

```bash
cd frontend && npm run check
cd frontend && npm run build
```

Expected: both commands PASS.

- [ ] **Step 6: Commit tuning changes**

```bash
git add frontend/src/routes/+page.svelte frontend/src/lib/components/ActivityStrip.svelte frontend/src/lib/components/LiveFieldWindow.svelte frontend/src/lib/components/DashboardSummary.svelte frontend/src/lib/components/DiscoveryNote.svelte frontend/src/app.css
git commit -m "fix(frontend): tune public dashboard responsiveness"
```

Skip the commit if no tuning changes were necessary.

---

## Self-Review

Spec coverage:

- Live Field Window: Task 3 and Task 5.
- Today at a Glance: Task 4 and Task 5.
- Slim Activity Strip: Task 1, Task 2, Task 5, and Task 6.
- Discovery-aware first station records: Task 1, Task 4, and Task 5.
- Mobile design: Task 5 and Task 6.
- No public gap-warning noise: Task 2 copy, Task 5 composition, and Task 6 checks.
- Live audio remains authenticated: Task 5 Step 8.
- Raspberry Pi performance: Task 2 avoids Chart.js on dashboard; Task 5 removes dashboard Chart.js import; Task 6 verifies build.
- Admin follow-ups remain out of scope: no task touches admin routes.

Placeholder scan:

- No TBD, TODO, "implement later", or unspecified test steps.
- The only future work is explicitly scoped to admin follow-up notes in the design spec, not part of this implementation plan.

Type consistency:

- `ActivitySegment` is defined in Task 1 and consumed by Tasks 2 and 3.
- `DiscoveryPreview` is defined in Task 1 and consumed by Task 4.
- `buildActivitySegments`, `buildDiscoveryPreview`, `isFirstStationRecord`, and `selectLatestDetection` names match Task 5 imports.
