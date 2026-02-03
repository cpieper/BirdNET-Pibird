<script lang="ts">
	import { currentlyPlaying } from '$lib/stores';

	export let src: string;
	export let filename: string = '';
	export let compact: boolean = false;

	let audio: HTMLAudioElement;
	let isPlaying = false;
	let currentTime = 0;
	let duration = 0;

	$: isCurrentlyPlaying = $currentlyPlaying === src;

	function togglePlay() {
		if (isPlaying) {
			audio.pause();
			currentlyPlaying.set(null);
		} else {
			// Stop any other playing audio
			if ($currentlyPlaying && $currentlyPlaying !== src) {
				const otherAudio = document.querySelector(`audio[src="${$currentlyPlaying}"]`) as HTMLAudioElement;
				if (otherAudio) otherAudio.pause();
			}
			audio.play();
			currentlyPlaying.set(src);
		}
	}

	function handleTimeUpdate() {
		currentTime = audio.currentTime;
	}

	function handleLoadedMetadata() {
		duration = audio.duration;
	}

	function handleEnded() {
		isPlaying = false;
		currentlyPlaying.set(null);
	}

	function handlePlay() {
		isPlaying = true;
	}

	function handlePause() {
		isPlaying = false;
	}

	function seek(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		audio.currentTime = percent * duration;
	}

	function formatTime(seconds: number): string {
		if (!isFinite(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<audio
	bind:this={audio}
	{src}
	on:timeupdate={handleTimeUpdate}
	on:loadedmetadata={handleLoadedMetadata}
	on:ended={handleEnded}
	on:play={handlePlay}
	on:pause={handlePause}
	preload="metadata"
/>

{#if compact}
	<button
		on:click={togglePlay}
		class="p-2 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
		aria-label={isPlaying ? 'Pause' : 'Play'}
	>
		{#if isPlaying}
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
				<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
			</svg>
		{:else}
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
				<path d="M8 5v14l11-7z" />
			</svg>
		{/if}
	</button>
{:else}
	<div class="flex items-center gap-3 p-3 bg-gray-100 dark:bg-dark-card rounded-lg">
		<button
			on:click={togglePlay}
			class="p-2 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors flex-shrink-0"
			aria-label={isPlaying ? 'Pause' : 'Play'}
		>
			{#if isPlaying}
				<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
					<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
				</svg>
			{:else}
				<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
			{/if}
		</button>

		<div class="flex-1 min-w-0">
			{#if filename}
				<p class="text-sm text-gray-700 dark:text-gray-300 truncate">{filename}</p>
			{/if}
			<div class="flex items-center gap-2">
				<span class="text-xs text-gray-500 dark:text-gray-400 w-10">{formatTime(currentTime)}</span>
				<button
					class="flex-1 h-2 bg-gray-300 dark:bg-dark-border rounded-full overflow-hidden cursor-pointer"
					on:click={seek}
					aria-label="Seek"
				>
					<div
						class="h-full bg-primary-500 transition-all"
						style="width: {duration ? (currentTime / duration) * 100 : 0}%"
					/>
				</button>
				<span class="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{formatTime(duration)}</span>
			</div>
		</div>
	</div>
{/if}
