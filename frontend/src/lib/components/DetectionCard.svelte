<script lang="ts">
	import type { Detection } from '$lib/api';
	import { media } from '$lib/api';
	import AudioPlayer from './AudioPlayer.svelte';
	import SpeciesImage from './SpeciesImage.svelte';

	export let detection: Detection;
	export let showDate: boolean = true;
	export let showImage: boolean = true;

	$: audioUrl = media.audioUrl(detection.Date, detection.Sci_Name, detection.File_Name);
	$: spectrogramUrl = media.spectrogramUrl(detection.Date, detection.Sci_Name, detection.File_Name);

	function formatTime(time: string): string {
		return time.slice(0, 5); // HH:MM
	}

	function formatConfidence(confidence: number): string {
		return `${(confidence * 100).toFixed(0)}%`;
	}
</script>

<div class="card p-4 fade-in">
	<div class="flex gap-4">
		<!-- Bird Image -->
		{#if showImage}
			<div class="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-dark-border">
				<SpeciesImage sciName={detection.Sci_Name} size="sm" />
			</div>
		{/if}

		<!-- Detection Info -->
		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between gap-2">
				<div>
					<h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">
						{detection.Com_Name}
					</h3>
					<p class="text-sm text-gray-500 dark:text-gray-400 italic truncate">
						{detection.Sci_Name}
					</p>
				</div>
				<span class="badge-primary flex-shrink-0">
					{formatConfidence(detection.Confidence)}
				</span>
			</div>

			<div class="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
				{#if showDate}
					<span>{detection.Date}</span>
				{/if}
				<span>{formatTime(detection.Time)}</span>
			</div>
		</div>
	</div>

	<!-- Spectrogram -->
	<div class="mt-3">
		<img
			src={spectrogramUrl}
			alt="Spectrogram for {detection.Com_Name}"
			class="w-full h-24 object-cover rounded-lg bg-gray-200 dark:bg-dark-border"
			loading="lazy"
		/>
	</div>

	<!-- Audio Player -->
	<div class="mt-3">
		<AudioPlayer src={audioUrl} filename={detection.File_Name} />
	</div>
</div>
