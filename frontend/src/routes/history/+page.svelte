<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { detections, integrations, type ChartData } from '$lib/api';
	import { toasts } from '$lib/stores';

	// Chart.js must be dynamically imported to avoid SSR issues
	let ChartJS: typeof import('chart.js/auto').default;

	let dates: string[] = [];
	let selectedDate = '';
	let chartData: ChartData | null = null;
	let loading = false;
	let exportLoading = false;

	let hourlyCanvas: HTMLCanvasElement;
	let speciesCanvas: HTMLCanvasElement;
	let hourlyChart: any = null;
	let speciesChart: any = null;

	// Detect dark mode
	let isDark = false;

	function detectTheme() {
		isDark = document.documentElement.classList.contains('dark');
	}

	function getChartColors() {
		return {
			text: isDark ? '#d1d5db' : '#374151',
			textMuted: isDark ? '#9ca3af' : '#6b7280',
			grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
			barBg: isDark ? 'rgba(34,197,94,0.6)' : 'rgba(22,163,74,0.7)',
			barBorder: isDark ? 'rgb(34,197,94)' : 'rgb(22,163,74)',
			barHoverBg: isDark ? 'rgba(34,197,94,0.85)' : 'rgba(22,163,74,0.9)',
			doughnutColors: [
				'#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed',
				'#0891b2', '#c026d3', '#ea580c', '#4f46e5', '#059669',
			],
		};
	}

	async function loadDates() {
		try {
			const result = await detections.dates();
			dates = result.dates;
			if (dates.length > 0) {
				selectedDate = dates[0];
				await loadChartData();
			}
		} catch (e) {
			console.error('Failed to load dates:', e);
		}
	}

	async function loadChartData() {
		if (!selectedDate) return;
		loading = true;
		try {
			chartData = await detections.chartData(selectedDate);
		} catch (e) {
			console.error('Failed to load chart data:', e);
			toasts.show('Failed to load chart data', 'error');
			chartData = null;
		} finally {
			loading = false;
		}
		// Wait for DOM update after loading=false so canvas elements are rendered,
		// then draw the charts
		await tick();
		renderCharts();
	}

	function renderCharts() {
		if (!chartData || !ChartJS) return;
		detectTheme();
		const colors = getChartColors();
		renderHourlyChart(colors);
		renderSpeciesChart(colors);
	}

	function renderHourlyChart(colors: ReturnType<typeof getChartColors>) {
		if (!chartData || !hourlyCanvas) return;

		if (hourlyChart) hourlyChart.destroy();

		const labels = chartData.hourly.map(h => {
			const hour = h.hour;
			if (hour === 0) return '12am';
			if (hour === 12) return '12pm';
			return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
		});

		hourlyChart = new ChartJS(hourlyCanvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [{
					label: 'Detections',
					data: chartData.hourly.map(h => h.count),
					backgroundColor: colors.barBg,
					borderColor: colors.barBorder,
					borderWidth: 1,
					borderRadius: 4,
					hoverBackgroundColor: colors.barHoverBg,
				}],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 500, easing: 'easeOutQuart' },
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: isDark ? '#1f2937' : '#fff',
						titleColor: colors.text,
						bodyColor: colors.text,
						borderColor: colors.grid,
						borderWidth: 1,
						padding: 12,
						cornerRadius: 8,
						callbacks: {
							label: (ctx) => `${ctx.parsed.y} detection${ctx.parsed.y !== 1 ? 's' : ''}`,
						},
					},
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: {
							color: colors.textMuted,
							font: { size: 11 },
							maxRotation: 0,
							callback: function(_value, index) {
								// Show every 3rd label to avoid crowding
								return index % 3 === 0 ? labels[index] : '';
							},
						},
					},
					y: {
						beginAtZero: true,
						grid: { color: colors.grid },
						ticks: {
							color: colors.textMuted,
							font: { size: 11 },
							precision: 0,
						},
					},
				},
			},
		});
	}

	function renderSpeciesChart(colors: ReturnType<typeof getChartColors>) {
		if (!chartData || !speciesCanvas || chartData.top_species.length === 0) return;

		if (speciesChart) speciesChart.destroy();

		const species = chartData.top_species.slice(0, 8);

		speciesChart = new ChartJS(speciesCanvas, {
			type: 'doughnut',
			data: {
				labels: species.map(s => s.com_name),
				datasets: [{
					data: species.map(s => s.count),
					backgroundColor: colors.doughnutColors.slice(0, species.length),
					borderWidth: 0,
					hoverOffset: 6,
				}],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '55%',
				animation: { duration: 600, easing: 'easeOutQuart' },
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: isDark ? '#1f2937' : '#fff',
						titleColor: colors.text,
						bodyColor: colors.text,
						borderColor: colors.grid,
						borderWidth: 1,
						padding: 12,
						cornerRadius: 8,
						callbacks: {
							label: (ctx) => {
								const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
								const pct = ((ctx.parsed / total) * 100).toFixed(0);
								return ` ${ctx.parsed} detections (${pct}%)`;
							},
						},
					},
				},
			},
		});
	}

	function prevDate() {
		const idx = dates.indexOf(selectedDate);
		if (idx < dates.length - 1) {
			selectedDate = dates[idx + 1];
			loadChartData();
		}
	}

	function nextDate() {
		const idx = dates.indexOf(selectedDate);
		if (idx > 0) {
			selectedDate = dates[idx - 1];
			loadChartData();
		}
	}

	async function exportEbird() {
		if (!selectedDate) return;
		
		exportLoading = true;
		try {
			const result = await integrations.ebirdExport(selectedDate);
			
			// Create download
			const blob = new Blob([result.csv], { type: 'text/csv' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `ebird-export-${selectedDate}.csv`;
			a.click();
			URL.revokeObjectURL(url);
			
			toasts.show(`Exported ${result.species_count} species`, 'success');
		} catch (e) {
			console.error('Failed to export:', e);
			toasts.show('Failed to export eBird data', 'error');
		} finally {
			exportLoading = false;
		}
	}

	// Watch for theme changes
	let themeObserver: MutationObserver;

	onMount(async () => {
		// Dynamically import Chart.js (cannot be imported at top level due to SSR)
		const module = await import('chart.js/auto');
		ChartJS = module.default;

		loadDates();
		// Re-render charts when dark mode toggles
		themeObserver = new MutationObserver(() => {
			if (chartData) renderCharts();
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});
	});

	onDestroy(() => {
		if (hourlyChart) hourlyChart.destroy();
		if (speciesChart) speciesChart.destroy();
		if (themeObserver) themeObserver.disconnect();
	});
</script>

<svelte:head>
	<title>History - BirdNET-Pi</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">History</h1>
		<p class="text-gray-600 dark:text-gray-400 mt-1">Daily detection charts and species breakdown</p>
	</div>

	<!-- Date navigation -->
	<div class="card p-4 mb-6">
		<div class="flex items-center justify-between">
			<button
				on:click={prevDate}
				disabled={dates.indexOf(selectedDate) >= dates.length - 1}
				class="btn-ghost disabled:opacity-50"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Previous
			</button>

			<div class="flex items-center gap-4">
				<select
					bind:value={selectedDate}
					on:change={loadChartData}
					class="select w-auto"
				>
					{#each dates as date}
						<option value={date}>{date}</option>
					{/each}
				</select>
			</div>

			<button
				on:click={nextDate}
				disabled={dates.indexOf(selectedDate) <= 0}
				class="btn-ghost disabled:opacity-50"
			>
				Next
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
	</div>

	{#if selectedDate}
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
			</div>
		{:else if chartData}
			<!-- Summary stats -->
			<div class="grid grid-cols-3 gap-4 mb-6">
				<div class="stat-card">
					<p class="stat-value">{chartData.total_detections}</p>
					<p class="stat-label">Total Detections</p>
				</div>
				<div class="stat-card">
					<p class="stat-value">{chartData.species_count}</p>
					<p class="stat-label">Species Detected</p>
				</div>
				<div class="stat-card">
					<p class="stat-value">{Math.max(...chartData.hourly.map(h => h.count))}</p>
					<p class="stat-label">Peak Hour</p>
				</div>
			</div>

			<!-- Hourly chart -->
			<div class="card mb-6">
				<div class="card-header flex items-center justify-between">
					<h2 class="font-semibold text-gray-900 dark:text-gray-100">
						Detections by Hour
					</h2>
					<button
						on:click={exportEbird}
						disabled={exportLoading}
						class="btn-secondary btn-sm"
					>
						{#if exportLoading}
							<span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
						{/if}
						Export to eBird
					</button>
				</div>
				<div class="card-body">
					<div class="h-72">
						<canvas bind:this={hourlyCanvas}></canvas>
					</div>
				</div>
			</div>

			<!-- Species breakdown -->
			<div class="grid md:grid-cols-3 gap-6 mb-6">
				<!-- Doughnut chart -->
				<div class="card">
					<div class="card-header">
						<h2 class="font-semibold text-gray-900 dark:text-gray-100">
							Species Distribution
						</h2>
					</div>
					<div class="card-body">
						{#if chartData.top_species.length > 0}
							<div class="h-56">
								<canvas bind:this={speciesCanvas}></canvas>
							</div>
						{:else}
							<p class="text-gray-500 dark:text-gray-400 text-center py-8">No species data</p>
						{/if}
					</div>
				</div>

				<!-- Top species list -->
				<div class="card md:col-span-2">
					<div class="card-header">
						<h2 class="font-semibold text-gray-900 dark:text-gray-100">
							Top Species
						</h2>
					</div>
					{#if chartData.top_species.length > 0}
						<div class="divide-y divide-gray-200 dark:divide-dark-border">
							{#each chartData.top_species as sp, i}
								<a href="/species/{encodeURIComponent(sp.sci_name)}" class="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
									<span
										class="w-3 h-3 rounded-full flex-shrink-0"
										style="background-color: {getChartColors().doughnutColors[i] || '#6b7280'}"
									/>
									<div class="flex-1 min-w-0">
										<p class="font-medium text-gray-900 dark:text-gray-100 truncate">{sp.com_name}</p>
										<p class="text-sm text-gray-500 dark:text-gray-400 italic truncate">{sp.sci_name}</p>
									</div>
									<div class="flex items-center gap-4 flex-shrink-0">
										<span class="badge-primary">{(sp.max_confidence * 100).toFixed(0)}%</span>
										<div class="text-right">
											<span class="text-lg font-semibold text-primary-600 dark:text-primary-400">{sp.count}</span>
										</div>
									</div>
								</a>
							{/each}
						</div>
					{:else}
						<div class="card-body text-center py-8">
							<p class="text-gray-500 dark:text-gray-400">No species detected on this date</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- View detections link -->
			<div class="text-center">
				<a
					href="/detections?date={selectedDate}"
					class="text-primary-600 dark:text-primary-400 hover:underline"
				>
					View all detections for {selectedDate} →
				</a>
			</div>
		{:else}
			<div class="card p-8 text-center">
				<p class="text-gray-600 dark:text-gray-400">No data available for this date</p>
			</div>
		{/if}
	{:else}
		<div class="card p-8 text-center">
			<p class="text-gray-600 dark:text-gray-400">No detection history available</p>
		</div>
	{/if}
</div>
