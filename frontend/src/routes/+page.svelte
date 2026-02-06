<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { detections, health, species as speciesApi, type Detection, type DetectionStats, type SpeciesSummary } from '$lib/api';
	import { StatsCard, DetectionCard, SpeciesImage } from '$lib/components';
	import { toasts } from '$lib/stores';

	let stats: DetectionStats | null = null;
	let latestDetections: Detection[] = [];
	let topSpecies: SpeciesSummary[] = [];
	let siteName: string = 'BirdNET-Pi';
	let loading = true;
	let refreshInterval: ReturnType<typeof setInterval>;

	async function loadData() {
		try {
			const [statsData, detectionsData, infoData, speciesData] = await Promise.all([
				detections.stats(),
				detections.today({ limit: 10 }),
				health.info(),
				speciesApi.list({ sort: 'count' }),
			]);
			
			stats = statsData;
			latestDetections = detectionsData.detections;
			siteName = infoData.site_name;
			topSpecies = speciesData.species.slice(0, 6);
		} catch (e) {
			console.error('Failed to load data:', e);
			toasts.show('Failed to load data', 'error');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
		// Refresh every 30 seconds
		refreshInterval = setInterval(loadData, 30000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});
</script>

<svelte:head>
	<title>{siteName} - Overview</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
			{siteName}
		</h1>
		<p class="text-gray-600 dark:text-gray-400 mt-1">
			Real-time bird detection dashboard
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
		</div>
	{:else}
		<!-- Stats Grid -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
			<StatsCard
				value={stats?.total_count || 0}
				label="Total Detections"
				icon="total"
			/>
			<StatsCard
				value={stats?.todays_count || 0}
				label="Today"
				icon="today"
			/>
			<StatsCard
				value={stats?.hour_count || 0}
				label="Last Hour"
				icon="hour"
			/>
			<StatsCard
				value={stats?.species_tally || 0}
				label="Species"
				icon="species"
			/>
		</div>

		<!-- Live indicator -->
		<div class="flex items-center gap-2 mb-4">
			<span class="w-3 h-3 bg-green-500 rounded-full pulse-live" />
			<span class="text-sm text-gray-600 dark:text-gray-400">
				Live - Auto-refreshing every 30 seconds
			</span>
		</div>

		<!-- Latest Detections -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
					Latest Detections
				</h2>
				<a href="/detections" class="text-primary-600 dark:text-primary-400 hover:underline text-sm">
					View all →
				</a>
			</div>

			{#if latestDetections.length === 0}
				<div class="card p-8 text-center">
					<svg class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
					</svg>
					<p class="text-gray-600 dark:text-gray-400">No detections today yet</p>
					<p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
						Detections will appear here as birds are identified
					</p>
				</div>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each latestDetections as detection (detection.File_Name)}
						<DetectionCard {detection} showDate={false} />
					{/each}
				</div>
			{/if}
		</div>

		<!-- Bottom Section -->
		<div class="grid md:grid-cols-3 gap-6">
			<!-- Today's Activity -->
			<div class="card">
				<div class="card-header">
					<h3 class="font-semibold text-gray-900 dark:text-gray-100">Today's Activity</h3>
				</div>
				<div class="card-body">
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<span class="text-gray-600 dark:text-gray-400">Detections</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{stats?.todays_count || 0}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-600 dark:text-gray-400">Species seen</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{stats?.todays_species_tally || 0}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-600 dark:text-gray-400">Last hour</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{stats?.hour_count || 0}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Top Species -->
			<div class="card md:col-span-2">
				<div class="card-header flex items-center justify-between">
					<h3 class="font-semibold text-gray-900 dark:text-gray-100">Top Species</h3>
					<a href="/species" class="text-primary-600 dark:text-primary-400 hover:underline text-sm">
						View all →
					</a>
				</div>
				{#if topSpecies.length === 0}
					<div class="card-body text-center py-8">
						<svg class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-gray-500 dark:text-gray-400">No species detected yet</p>
						<p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Species will appear here as they are identified</p>
					</div>
				{:else}
					<div class="divide-y divide-gray-200 dark:divide-dark-border">
						{#each topSpecies as sp (sp.Sci_Name)}
							<a href="/species/{encodeURIComponent(sp.Sci_Name)}" class="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
								<div class="flex-shrink-0 rounded-full overflow-hidden">
									<SpeciesImage sciName={sp.Sci_Name} size="xs" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-gray-900 dark:text-gray-100 truncate">{sp.Com_Name}</p>
									<p class="text-sm text-gray-500 dark:text-gray-400 italic truncate">{sp.Sci_Name}</p>
								</div>
								<div class="flex-shrink-0 text-right">
									<span class="text-lg font-semibold text-primary-600 dark:text-primary-400">{sp.Count}</span>
									<p class="text-xs text-gray-500 dark:text-gray-400">{sp.Count === 1 ? 'detection' : 'detections'}</p>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
