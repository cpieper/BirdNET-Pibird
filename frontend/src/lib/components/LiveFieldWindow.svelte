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
	export let showActivityStrip = true;

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
			<p class="text-sm text-gray-500 dark:text-gray-400">Refreshes every 60s while this tab is visible.</p>
		</div>
		<span class="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
			<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
			Live
		</span>
	</div>

	{#if detection}
		<div class="grid gap-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
			<a href={speciesHref} class="h-24 w-24 overflow-hidden rounded-lg bg-gray-200 ring-1 ring-gray-200 dark:bg-dark-border dark:ring-dark-border">
				<SpeciesImage sciName={detection.Sci_Name} size="sm" fill />
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

	{#if showActivityStrip}
		<div class="mt-4">
			<ActivityStrip segments={activitySegments} href={activityHref} />
		</div>
	{/if}
</section>
