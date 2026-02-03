<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { detections, health, type Detection, type DetectionStats } from '$lib/api';
	import { StatsCard, DetectionCard } from '$lib/components';
	import { toasts } from '$lib/stores';

	let stats: DetectionStats | null = null;
	let latestDetections: Detection[] = [];
	let siteInfo: { name: string; version: string } | null = null;
	let loading = true;
	let refreshInterval: ReturnType<typeof setInterval>;

	async function loadData() {
		try {
			const [statsData, detectionsData, infoData] = await Promise.all([
				detections.stats(),
				detections.today({ limit: 10 }),
				health.info(),
			]);
			
			stats = statsData;
			latestDetections = detectionsData.detections;
			siteInfo = { name: infoData.site_name, version: infoData.version };
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
	<title>{siteInfo?.name || 'BirdNET-Pi'} - Overview</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
			{siteInfo?.name || 'BirdNET-Pi'}
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

		<!-- Quick Stats Summary -->
		<div class="grid md:grid-cols-2 gap-6">
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

			<!-- System Info -->
			<div class="card">
				<div class="card-header">
					<h3 class="font-semibold text-gray-900 dark:text-gray-100">System</h3>
				</div>
				<div class="card-body">
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<span class="text-gray-600 dark:text-gray-400">Version</span>
							<span class="font-mono text-sm text-gray-900 dark:text-gray-100">{siteInfo?.version || 'Unknown'}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-600 dark:text-gray-400">All-time detections</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{stats?.total_count || 0}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-600 dark:text-gray-400">Total species</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{stats?.species_tally || 0}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
