<script lang="ts">
	import type { ActivitySegment } from '$lib/dashboard';

	export let segments: ActivitySegment[] = [];
	export let href = '/history';

	function heightFor(segment: ActivitySegment): string {
		if (segment.count === 0) return '0.125rem';
		return `${Math.max(0.35, segment.intensity) * 2}rem`;
	}

	function isOvernightQuiet(segment: ActivitySegment): boolean {
		return segment.count === 0 && (segment.hour < 6 || segment.hour >= 21);
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
			<p class="text-xs text-gray-500 dark:text-gray-400">24-hour rhythm with overnight quiet</p>
		</div>
		<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Insights</span>
	</div>
	<div class="grid h-9 grid-cols-24 items-end gap-0.5" aria-hidden="true">
		{#each segments as segment (segment.hour)}
			<span
				class="block rounded-sm {isOvernightQuiet(segment)
					? 'border-t-2 border-gray-200 bg-gray-200/70 dark:border-gray-700 dark:bg-gray-700/70'
					: segment.count === 0
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
