<script lang="ts">
	import { onMount } from 'svelte';
	import { detections, media, integrations } from '$lib/api';
	import { toasts } from '$lib/stores';

	let dates: string[] = [];
	let selectedDate = '';
	let chartUrl = '';
	let loading = false;
	let exportLoading = false;

	async function loadDates() {
		try {
			const result = await detections.dates();
			dates = result.dates;
			if (dates.length > 0) {
				selectedDate = dates[0];
				updateChart();
			}
		} catch (e) {
			console.error('Failed to load dates:', e);
		}
	}

	function updateChart() {
		if (selectedDate) {
			chartUrl = media.chartUrl(selectedDate);
		}
	}

	function prevDate() {
		const idx = dates.indexOf(selectedDate);
		if (idx < dates.length - 1) {
			selectedDate = dates[idx + 1];
			updateChart();
		}
	}

	function nextDate() {
		const idx = dates.indexOf(selectedDate);
		if (idx > 0) {
			selectedDate = dates[idx - 1];
			updateChart();
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

	onMount(loadDates);
</script>

<svelte:head>
	<title>History - BirdNET-Pi</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">History</h1>
		<p class="text-gray-600 dark:text-gray-400 mt-1">View daily detection charts</p>
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
					on:change={updateChart}
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

	<!-- Chart -->
	{#if selectedDate}
		<div class="card overflow-hidden mb-6">
			<div class="card-header flex items-center justify-between">
				<h2 class="font-semibold text-gray-900 dark:text-gray-100">
					Detections for {selectedDate}
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
			<div class="p-4 bg-white dark:bg-dark-body">
				{#key chartUrl}
					<img
						src={chartUrl}
						alt="Detection chart for {selectedDate}"
						class="w-full"
						on:error={() => toasts.show('Chart not available for this date', 'info')}
					/>
				{/key}
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
			<p class="text-gray-600 dark:text-gray-400">No detection history available</p>
		</div>
	{/if}
</div>
