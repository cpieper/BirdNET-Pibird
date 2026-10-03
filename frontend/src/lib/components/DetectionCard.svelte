<script lang="ts">
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	import type { Detection, SpeciesExternalLinks } from '$lib/api';
	import { media } from '$lib/api';
	import AudioPlayer from './AudioPlayer.svelte';
	import ExternalLinks from './ExternalLinks.svelte';
	import SpeciesImage from './SpeciesImage.svelte';

	export let detection: Detection;
	export let showDate: boolean = true;
	export let showImage: boolean = true;
	export let href: string | null = null;
	export let tagLabel: string | null = null;
	export let allowDelete: boolean = false;
	export let deleting: boolean = false;
	export let speciesLinks: SpeciesExternalLinks | null = null;
	export let allowSpectrogramExpand: boolean = true;
	/** When > 1, shows the grouped detection count as a compact header pill. */
	export let groupedCount: number | null = null;
	let spectrogramExpanded = false;

	$: additionalDetectionCount =
		groupedCount != null && groupedCount > 1 ? groupedCount - 1 : 0;
	$: groupedSummary =
		additionalDetectionCount > 0
			? `${groupedCount ?? 0} detections`
			: '';

	const dispatch = createEventDispatcher<{ delete: Detection }>();

	$: audioUrl = media.audioUrl(detection.Date, detection.Sci_Name, detection.File_Name);
	$: spectrogramUrl = media.spectrogramUrl(detection.Date, detection.Sci_Name, detection.File_Name);
	$: temporalZoomUrls = {
		'0.85': media.temporalZoomAudioUrl(detection.Date, detection.Sci_Name, detection.File_Name, 0.85),
		'0.7': media.temporalZoomAudioUrl(detection.Date, detection.Sci_Name, detection.File_Name, 0.7),
		'0.6': media.temporalZoomAudioUrl(detection.Date, detection.Sci_Name, detection.File_Name, 0.6),
		'0.5': media.temporalZoomAudioUrl(detection.Date, detection.Sci_Name, detection.File_Name, 0.5),
	};
	$: temporalZoomPrepareUrls = {
		'0.85': media.temporalZoomPrepareUrl(detection.Date, detection.Sci_Name, detection.File_Name, 0.85),
		'0.7': media.temporalZoomPrepareUrl(detection.Date, detection.Sci_Name, detection.File_Name, 0.7),
		'0.6': media.temporalZoomPrepareUrl(detection.Date, detection.Sci_Name, detection.File_Name, 0.6),
		'0.5': media.temporalZoomPrepareUrl(detection.Date, detection.Sci_Name, detection.File_Name, 0.5),
	};

	function formatTime(time: string): string {
		return time.slice(0, 5); // HH:MM
	}

	function formatConfidence(confidence: number): string {
		return `${(confidence * 100).toFixed(0)}%`;
	}

	function shouldIgnoreCardNav(target: HTMLElement): boolean {
		return Boolean(
			target.closest('button, a, audio, input, select, textarea, summary, [data-no-card-link]')
		);
	}

	function handleCardClick(event: MouseEvent) {
		if (!href) return;
		const target = event.target as HTMLElement;
		if (shouldIgnoreCardNav(target)) return;
		void goto(href);
	}

	function handleDeleteClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		dispatch('delete', detection);
	}

	function toggleSpectrogram(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		spectrogramExpanded = !spectrogramExpanded;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="card w-full max-w-full p-3 fade-in sm:p-4 {href ? 'cursor-pointer hover:border-primary-200 hover:shadow-md transition-shadow dark:hover:border-primary-900' : ''}"
	on:click={handleCardClick}
>
	<div class="flex gap-3 sm:gap-4">
		<!-- Bird Image -->
		{#if showImage}
			<div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-dark-border">
				<SpeciesImage sciName={detection.Sci_Name} size="sm" />
			</div>
		{/if}

		<!-- Detection Info -->
		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					{#if href}
						<a
							href={href}
							class="block truncate font-semibold text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-gray-100 dark:focus-visible:ring-offset-dark-card"
						>
							{detection.Com_Name}
						</a>
					{:else}
						<h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">
							{detection.Com_Name}
						</h3>
					{/if}
					<div class="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1" data-no-card-link>
						<p class="max-w-full truncate text-sm italic text-gray-500 dark:text-gray-400">
							{detection.Sci_Name}
						</p>
						<ExternalLinks
							links={speciesLinks}
							sciName={detection.Sci_Name}
							comName={detection.Com_Name}
							compact={true}
						/>
					</div>
					<div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
						<span class="metric-pill">
							{#if showDate}{detection.Date} · {/if}{formatTime(detection.Time)}
						</span>
						{#if tagLabel}
							<span class="rounded-md bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
								{tagLabel}
							</span>
						{/if}
						{#if groupedSummary}
							<span class="metric-pill-primary">
								{groupedSummary}
							</span>
						{/if}
					</div>
				</div>
				<div class="flex flex-shrink-0 items-center gap-2" data-no-card-link>
					<span class="metric-pill-primary py-1 font-semibold">
						{formatConfidence(detection.Confidence)}
					</span>
					{#if allowDelete}
						<button
							class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
							data-no-card-link
							on:click={handleDeleteClick}
							disabled={deleting}
							title="Delete detection and recording"
							aria-label="Delete detection and recording"
						>
							{#if deleting}
								<span class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
							{:else}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
								</svg>
							{/if}
						</button>
					{/if}
				</div>
			</div>

		</div>
	</div>

	<!-- Expanded inspection shares the existing player's audio element. -->
	<div class="mt-3 relative" data-no-card-link>
		{#if spectrogramExpanded}
			<div class="flex justify-end">
				<button type="button" class="btn-secondary btn-sm" on:click={toggleSpectrogram} aria-expanded="true">Collapse Spectrogram</button>
			</div>
		{:else if allowSpectrogramExpand}
			<button type="button" class="group relative block w-full rounded-lg focus-visible:ring-2 focus-visible:ring-primary-500"
				on:click={toggleSpectrogram} aria-expanded="false" aria-label={`Expand spectrogram for ${detection.Com_Name}`} title="Expand spectrogram">
				<img src={spectrogramUrl} alt="Spectrogram for {detection.Com_Name}" class="block h-24 w-full rounded-lg bg-gray-200 object-cover dark:bg-dark-border" loading="lazy" />
				<span class="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">Inspect</span>
			</button>
		{:else}
			<img src={spectrogramUrl} alt="Spectrogram for {detection.Com_Name}" class="block h-24 w-full rounded-lg bg-gray-200 object-cover dark:bg-dark-border" loading="lazy" />
		{/if}
	</div>

	<!-- Audio Player -->
	<div class="mt-3" data-no-card-link>
		<AudioPlayer
			src={audioUrl}
			filename={detection.File_Name}
			temporalZoomProminent={spectrogramExpanded}
			spectrogramUrl={spectrogramExpanded ? spectrogramUrl : ''}
			spectrogramPlotUrl={spectrogramExpanded ? media.spectrogramPlotUrl(detection.Date, detection.Sci_Name, detection.File_Name) : ''}
			{temporalZoomUrls}
			{temporalZoomPrepareUrls}
		/>
	</div>
</div>
