<script lang="ts">
	import { onMount } from 'svelte';
	import { detections, species as speciesApi, type SpeciesSummary } from '$lib/api';
	import { DatePicker, ExternalLinks, SpeciesImage } from '$lib/components';
	import { toasts } from '$lib/stores';

	type DateFilter = 'all' | 'today' | 'pick';

	let speciesList: SpeciesSummary[] = [];
	let loading = true;
	let sortBy = 'count';
	let searchTerm = '';
	let dateFilter: DateFilter = 'all';
	let pickedDate = '';
	let availableDates: string[] = [];
	$: datePickerValue =
		dateFilter === 'all' ? '' : dateFilter === 'today' ? todayStr() : pickedDate;

	$: filteredSpecies = searchTerm
		? speciesList.filter(
				(s) =>
					s.Com_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					s.Sci_Name.toLowerCase().includes(searchTerm.toLowerCase())
			)
		: speciesList;

	$: subtitle =
		dateFilter === 'today'
			? `Species detected today (${todayStr()})`
			: dateFilter === 'pick' && pickedDate
				? `Species detected on ${pickedDate}`
				: 'All detected species';

	$: emptyMessage =
		dateFilter === 'all'
			? 'No species found'
			: dateFilter === 'today'
				? 'No species detected today yet'
				: pickedDate
					? `No species detected on ${pickedDate}`
					: 'Choose a date to view species';

	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function activeDateParam(): string | undefined {
		if (dateFilter === 'today') return todayStr();
		if (dateFilter === 'pick' && pickedDate) return pickedDate;
		return undefined;
	}

	function syncUrl() {
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		if (dateFilter === 'all') {
			url.searchParams.delete('date');
		} else if (dateFilter === 'today') {
			url.searchParams.set('date', 'today');
		} else if (pickedDate) {
			url.searchParams.set('date', pickedDate);
		} else {
			url.searchParams.delete('date');
		}
		const search = url.searchParams.toString();
		window.history.replaceState({}, '', search ? `${url.pathname}?${search}` : url.pathname);
	}

	function parseUrl() {
		if (typeof window === 'undefined') return;
		const date = new URLSearchParams(window.location.search).get('date');
		if (!date) {
			dateFilter = 'all';
			return;
		}
		if (date === 'today') {
			dateFilter = 'today';
			return;
		}
		if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			dateFilter = 'pick';
			pickedDate = date;
		}
	}

	async function loadDates() {
		try {
			const result = await detections.dates();
			availableDates = result.dates;
		} catch (e) {
			console.error('Failed to load dates:', e);
		}
	}

	async function loadSpecies() {
		if (dateFilter === 'pick' && !pickedDate) {
			speciesList = [];
			loading = false;
			return;
		}

		loading = true;
		try {
			const date = activeDateParam();
			const result = await speciesApi.list({ sort: sortBy, date });
			speciesList = result.species;
		} catch (e) {
			console.error('Failed to load species:', e);
			toasts.show('Failed to load species', 'error');
		} finally {
			loading = false;
		}
	}

	function setDateFilter(filter: DateFilter) {
		dateFilter = filter;
		if (filter === 'all') {
			pickedDate = '';
		} else if (filter === 'today') {
			pickedDate = todayStr();
		} else if (!pickedDate) {
			pickedDate = availableDates[0] || todayStr();
		}
		syncUrl();
		void loadSpecies();
	}

	function handleDatePickerChange(event: CustomEvent<string>) {
		const nextDate = event.detail;
		if (!nextDate) {
			dateFilter = 'all';
			pickedDate = '';
		} else {
			dateFilter = nextDate === todayStr() ? 'today' : 'pick';
			pickedDate = nextDate;
		}
		syncUrl();
		void loadSpecies();
	}

	function handleSortChange() {
		void loadSpecies();
	}

	function formatConfidence(confidence: number): string {
		return `${(confidence * 100).toFixed(0)}%`;
	}

	onMount(async () => {
		parseUrl();
		await loadDates();
		await loadSpecies();
	});
</script>

<svelte:head>
	<title>Species - BirdNET-Pi</title>
</svelte:head>

<div class="page-shell">
	<div class="page-header">
		<div>
			<h1 class="page-title">Species</h1>
			<p class="page-subtitle">{subtitle}</p>
		</div>
		<a href="/species/manage" class="btn-secondary self-start sm:self-auto">Manage Lists</a>
	</div>

	<!-- Filters -->
	<div class="filter-card">
		<div class="grid gap-3 lg:grid-cols-[minmax(16rem,18rem)_auto_minmax(16rem,1fr)_12rem] lg:items-end">
			<DatePicker
				id="speciesDate"
				label="Date"
				value={datePickerValue}
				dates={availableDates}
				includeAll={true}
				allLabel="All"
				on:change={handleDatePickerChange}
			/>

			<div>
				<label for="speciesToday" class="sr-only">Today</label>
				<button
					id="speciesToday"
					type="button"
					class="inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors lg:min-w-24 {dateFilter === 'today'
						? 'border-primary-600 bg-primary-600 text-white'
						: 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100 dark:border-dark-border dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-hover'}"
					aria-pressed={dateFilter === 'today'}
					on:click={() => setDateFilter('today')}
				>
					Today
				</button>
			</div>

			<div>
				<label for="search" class="label">Search</label>
				<input
					id="search"
					type="text"
					bind:value={searchTerm}
					placeholder="Search species..."
					class="input"
				/>
			</div>

			<div>
				<label for="sort" class="label">Sort by</label>
				<select id="sort" bind:value={sortBy} on:change={handleSortChange} class="select">
					<option value="count">Detection count</option>
					<option value="confidence">Max confidence</option>
					<option value="date">Most recent</option>
					<option value="name">Name</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Species count -->
	<div class="section-header">
		<div>
			<h2 class="section-title">Detected species</h2>
			<p class="section-subtitle">Browse historical species records and open detail pages.</p>
		</div>
		<span class="metric-pill">{filteredSpecies.length} species</span>
	</div>

	<!-- Species list -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if filteredSpecies.length === 0}
		<div class="card p-8 text-center">
			<p class="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
		</div>
	{:else}
		<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredSpecies as sp (sp.Sci_Name)}
				<div class="species-card">
					<SpeciesImage sciName={sp.Sci_Name} size="sm" />
					<div class="flex-1 min-w-0">
						<a href="/species/{encodeURIComponent(sp.Sci_Name)}">
							<h3 class="species-card-title hover:underline">
								{sp.Com_Name}
							</h3>
							<p class="species-card-subtitle">
								{sp.Sci_Name}
							</p>
						</a>
						<div class="mt-1">
							<ExternalLinks sciName={sp.Sci_Name} comName={sp.Com_Name} compact={true} />
						</div>
						<div class="species-card-meta">
							<span class="metric-pill">
								{sp.Count} {sp.Count === 1 ? 'detection' : 'detections'}{dateFilter === 'all' ? '' : ' on this day'}
							</span>
							<span class="metric-pill-primary">
								{formatConfidence(sp.MaxConfidence)}
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
