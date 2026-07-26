<script lang="ts">
	import type { DetectionStats } from '$lib/api';

	export let stats: DetectionStats | null = null;

	const metrics = [
		{ label: 'Detections today', value: () => stats?.todays_count ?? 0, href: '/history?mode=day' },
		{ label: 'Species today', value: () => stats?.todays_species_tally ?? 0, href: '/species?date=today' },
		{ label: 'All-time detections', value: () => stats?.total_count ?? 0, href: '/history' },
		{ label: 'Station species', value: () => stats?.species_tally ?? 0, href: '/species' },
	];

	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	$: todayHref = `/detections?date=${todayStr()}&new_on_date=true`;
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
		<a href={todayHref} class="mt-3 inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-900/25 dark:text-amber-200">
			{stats?.new_species_today} first station {(stats?.new_species_today ?? 0) === 1 ? 'record' : 'records'} today
		</a>
	{/if}
</section>
