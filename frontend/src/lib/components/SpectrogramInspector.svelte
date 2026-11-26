<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { normalizeSelection, pointerTime, type TimeSelection } from '$lib/playbackTimeline';

	export let imageUrl: string;
	export let plotUrl: string;
	export let duration = 0;
	export let currentTime = 0;
	export let selection: TimeSelection | null = null;
	export let looping = false;

	const dispatch = createEventDispatcher<{
		seek: number; select: TimeSelection | null; loop: boolean; preview: void;
	}>();
	let plotReady = false;
	let plotFailed = false;
	let selecting = false;
	let dragStart: number | null = null;
	let requestedPlot = '';
	$: if (plotUrl !== requestedPlot) {
		requestedPlot = plotUrl;
		plotReady = false;
		plotFailed = false;
	}
	$: enabled = plotReady && Number.isFinite(duration) && duration > 0;
	$: progress = duration > 0 ? Math.max(0, Math.min(100, currentTime / duration * 100)) : 0;

	function seconds(value: number): string { return `${value.toFixed(2)} s`; }
	function timeAt(event: PointerEvent): number {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		return pointerTime(event.clientX, rect.left, rect.width, duration);
	}
	function pointerDown(event: PointerEvent) {
		if (!enabled || !event.isPrimary || event.button !== 0) return;
		(event.currentTarget as HTMLElement).focus();
		if (!selecting) { dispatch('seek', timeAt(event)); return; }
		dragStart = timeAt(event);
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function pointerMove(event: PointerEvent) {
		if (dragStart === null) return;
		dispatch('select', normalizeSelection(dragStart, timeAt(event), duration));
	}
	function pointerUp(event: PointerEvent) {
		if (dragStart === null) return;
		const end = timeAt(event);
		dispatch('select', normalizeSelection(dragStart, end, duration) ?? normalizeSelection(dragStart, dragStart + 1, duration));
		dragStart = null;
		if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) {
			(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		}
	}
	function keySeek(event: KeyboardEvent) {
		if (!enabled) return;
		const changes: Record<string, number> = {
			ArrowLeft: currentTime - 0.1, ArrowRight: currentTime + 0.1,
			Home: 0, End: duration,
		};
		if (!(event.key in changes)) return;
		event.preventDefault();
		dispatch('seek', Math.max(0, Math.min(duration, changes[event.key])));
	}
	function changeBoundary(event: Event, boundary: 'start' | 'end') {
		if (!selection) return;
		const value = Number((event.currentTarget as HTMLInputElement).value);
		const next = boundary === 'start'
			? normalizeSelection(Math.min(value, selection.end - 0.05), selection.end, duration)
			: normalizeSelection(selection.start, Math.max(value, selection.start + 0.05), duration);
		dispatch('select', next);
	}
</script>

<section class="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-dark-border dark:bg-dark-nav/40" aria-label="Recording spectrogram inspector">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<div>
			<p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Spectrogram</p>
			<p class="text-xs text-gray-500 dark:text-gray-400">{selecting ? 'Drag across the plot to select a passage' : 'Tap the plot to seek · Arrow keys move by 0.1 s'}</p>
		</div>
		<button type="button" class="btn-secondary btn-sm" disabled={!enabled} aria-pressed={selecting} on:click={() => {
			selecting = !selecting;
			if (selecting && !selection) dispatch('select', normalizeSelection(currentTime, Math.min(duration, currentTime + 1), duration) ?? { start: 0, end: duration });
		}}>{selecting ? 'Done Selecting' : 'Select Passage'}</button>
	</div>
	{#if plotFailed}
		<img src={imageUrl} alt="Saved recording spectrogram" class="max-h-80 w-full rounded-lg object-contain" />
		<div class="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
			<p>Interactive plot unavailable. Playback controls remain available.</p>
			<button type="button" class="btn-secondary btn-sm" on:click={() => { plotFailed = false; plotReady = false; }}>Retry</button>
		</div>
	{:else}
		<div class="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2">
			<div class="flex h-56 flex-col justify-between py-0.5 text-right text-[10px] text-gray-500 dark:text-gray-400 sm:h-72" aria-hidden="true">
				<span>12 kHz</span><span>9 kHz</span><span>6 kHz</span><span>3 kHz</span><span>0</span>
			</div>
			<div class="relative h-56 overflow-hidden rounded-lg bg-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:h-72"
				class:cursor-crosshair={selecting} class:cursor-pointer={!selecting}
				style:touch-action={selecting ? 'none' : 'pan-y'}
				role="slider" tabindex="0" aria-label="Seek recording on spectrogram" aria-disabled={!enabled}
				aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} aria-valuetext={seconds(currentTime)}
				on:pointerdown={pointerDown} on:pointermove={pointerMove} on:pointerup={pointerUp}
				on:pointercancel={() => dragStart = null} on:keydown={keySeek}>
				<img src={plotUrl} alt="Frequency intensity across the recording" draggable="false" class="pointer-events-none h-full w-full"
					on:load={() => plotReady = true} on:error={() => plotFailed = true} />
				{#if !plotReady}<span class="absolute inset-0 flex items-center justify-center text-sm text-gray-300">Loading spectrogram…</span>{/if}
				{#if enabled}
					{#if selection}
						<div class="pointer-events-none absolute inset-y-0 border-x-2 border-amber-300 bg-amber-300/20"
							style:left={`${selection.start / duration * 100}%`} style:width={`${(selection.end - selection.start) / duration * 100}%`}></div>
					{/if}
					<div class="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_4px_#000]" style:left={`calc(${progress}% - ${progress === 100 ? 2 : 0}px)`}></div>
				{/if}
			</div>
			<div></div>
			<div class="mt-1 flex justify-between text-[10px] text-gray-500 dark:text-gray-400" aria-hidden="true">
				{#each [0, 0.25, 0.5, 0.75, 1] as fraction}<span>{seconds(duration * fraction)}</span>{/each}
			</div>
		</div>
	{/if}
	{#if selection}
		<div class="mt-3 space-y-2">
			<div class="flex flex-wrap items-center gap-2">
				<p class="mr-auto text-xs font-medium text-gray-700 dark:text-gray-200">Passage: {seconds(selection.start)} – {seconds(selection.end)}</p>
				<button type="button" class="btn-secondary btn-sm" on:click={() => dispatch('preview')}>Play Passage</button>
				<button type="button" class="btn-secondary btn-sm" aria-pressed={looping} on:click={() => dispatch('loop', !looping)}>{looping ? 'Repeat On' : 'Repeat'}</button>
				<button type="button" class="btn-secondary btn-sm" on:click={() => { dispatch('select', null); selecting = false; }}>Clear</button>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="text-xs text-gray-600 dark:text-gray-400">Passage start ({seconds(selection.start)})
					<input type="range" class="block min-h-8 w-full accent-amber-500" min={0} max={duration} step="0.01" value={selection.start} on:input={event => changeBoundary(event, 'start')} />
				</label>
				<label class="text-xs text-gray-600 dark:text-gray-400">Passage end ({seconds(selection.end)})
					<input type="range" class="block min-h-8 w-full accent-amber-500" min={0} max={duration} step="0.01" value={selection.end} on:input={event => changeBoundary(event, 'end')} />
				</label>
			</div>
		</div>
	{/if}
</section>
