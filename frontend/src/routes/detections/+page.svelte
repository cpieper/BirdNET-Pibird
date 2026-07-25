<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		detections,
		media,
		species as speciesApi,
		speciesLists,
		type Detection,
		type SpeciesSummary,
	} from '$lib/api';
	import { verifyPasswordLogin } from '$lib/auth';
	import { DatePicker, DetectionCard, Modal } from '$lib/components';
	import { auth, toasts } from '$lib/stores';

	let allDetections: Detection[] = [];
	let loading = true;
	let speciesQuery = '';
	let searchTerm = '';
	let selectedDate = '';
	let selectedSpecies = '';
	let newOnDateOnly = false;
	let speciesOptions: SpeciesSummary[] = [];
	let availableDates: string[] = [];
	let limit = 20;
	let offset = 0;
	let total = 0;
	let hasMore = false;
	let deletingFiles = new Set<string>();
	let shiftingFiles = new Set<string>();
	let showLoginModal = false;
	let passwordInput = '';
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let detectionsRequestId = 0;

	$: selectedSpeciesLabel =
		speciesOptions.find((species) => species.Sci_Name === selectedSpecies)?.Com_Name || selectedSpecies;
	$: hasSpeciesFilter = Boolean(selectedSpecies || searchTerm);
	$: speciesFilterLabel = selectedSpecies ? selectedSpeciesLabel : searchTerm;
	$: hasActiveFilters = Boolean(selectedDate || hasSpeciesFilter || newOnDateOnly);
	$: resultLabel = `Showing ${allDetections.length} of ${total} ${hasSpeciesFilter ? 'matching detections' : 'detections'}`;

	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function speciesFolderFromFilename(filename: string): string {
		const match = filename.match(/^(.+?)-\d+-\d{4}-/);
		if (match?.[1]) return match[1];
		return filename.split(/-(?=\d)/, 1)[0] || filename;
	}

	function detectionRecordingsHref(detection: Detection): string {
		const params = new URLSearchParams({
			date: detection.Date,
			species: speciesFolderFromFilename(detection.File_Name),
			sci: detection.Sci_Name,
			com: detection.Com_Name,
		});
		return `/recordings?${params.toString()}`;
	}

	async function loadDetections(reset = false) {
		const requestId = ++detectionsRequestId;

		if (reset) {
			offset = 0;
			allDetections = [];
		}

		loading = true;
		try {
			const params: { limit: number; offset: number; date?: string; species?: string; search?: string; new_on_date?: boolean } = { limit, offset };
			if (selectedDate) params.date = selectedDate;
			if (selectedSpecies) params.species = selectedSpecies;
			if (searchTerm.trim()) params.search = searchTerm.trim();
			if (newOnDateOnly && selectedDate) params.new_on_date = true;

			const result = await detections.list(params);
			if (requestId !== detectionsRequestId) return;
			if (reset) {
				allDetections = result.detections;
			} else {
				allDetections = [...allDetections, ...result.detections];
			}
			total = result.total;
			hasMore = allDetections.length < total;
		} catch (e) {
			if (requestId !== detectionsRequestId) return;
			console.error('Failed to load detections:', e);
			toasts.show('Failed to load detections', 'error');
		} finally {
			if (requestId !== detectionsRequestId) return;
			loading = false;
		}
	}

	async function loadSpeciesOptions() {
		try {
			const result = await speciesApi.list({ sort: 'name', date: selectedDate || undefined });
			speciesOptions = result.species;
			if (selectedSpecies && !speciesOptions.some((item) => item.Sci_Name === selectedSpecies)) {
				selectedSpecies = '';
			}
			syncSpeciesQueryFromFilters();
		} catch (e) {
			console.error('Failed to load species options:', e);
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

	function loadMore() {
		offset += limit;
		loadDetections();
	}

	async function handleDateChange() {
		if (!selectedDate) {
			newOnDateOnly = false;
		}
		await loadSpeciesOptions();
		void loadDetections(true);
	}

	function handleNewOnDateToggle() {
		if (!selectedDate) {
			newOnDateOnly = false;
			return;
		}
		void loadDetections(true);
	}

	function normalizeSpeciesValue(value: string): string {
		return value.trim().toLowerCase();
	}

	function speciesMatchForQuery(value: string): SpeciesSummary | undefined {
		const query = normalizeSpeciesValue(value);
		if (!query) return undefined;
		return speciesOptions.find(
			(species) =>
				normalizeSpeciesValue(species.Com_Name) === query ||
				normalizeSpeciesValue(species.Sci_Name) === query
		);
	}

	function syncSpeciesQueryFromFilters() {
		const selectedOption = speciesOptions.find((species) => species.Sci_Name === selectedSpecies);
		speciesQuery = selectedSpecies ? selectedOption?.Com_Name || selectedSpecies : searchTerm;
	}

	function applySpeciesQuery(immediate = false) {
		const query = speciesQuery.trim();
		const match = speciesMatchForQuery(query);
		selectedSpecies = match?.Sci_Name || '';
		searchTerm = match ? '' : query;

		if (searchTimer) clearTimeout(searchTimer);
		if (immediate) {
			void loadDetections(true);
			return;
		}
		searchTimer = setTimeout(() => {
			void loadDetections(true);
		}, 250);
	}

	function handleSpeciesQueryInput() {
		applySpeciesQuery();
	}

	function handleSpeciesQueryCommit() {
		applySpeciesQuery(true);
	}

	function clearDateFilter() {
		selectedDate = '';
		newOnDateOnly = false;
		void loadSpeciesOptions();
		void loadDetections(true);
	}

	function clearSpeciesQueryFilter() {
		selectedSpecies = '';
		searchTerm = '';
		speciesQuery = '';
		if (searchTimer) clearTimeout(searchTimer);
		void loadDetections(true);
	}

	function clearAllFilters() {
		selectedDate = '';
		selectedSpecies = '';
		searchTerm = '';
		speciesQuery = '';
		newOnDateOnly = false;
		if (searchTimer) clearTimeout(searchTimer);
		void loadSpeciesOptions();
		void loadDetections(true);
	}

	async function requireAuth(): Promise<boolean> {
		if ($auth.isAuthenticated) return true;
		showLoginModal = true;
		return false;
	}

	async function deleteDetectionFile(detection: Detection) {
		if (!(await requireAuth())) return;
		if (!confirm(`Delete recording and detection for ${detection.Com_Name} at ${detection.Time}?`)) return;

		deletingFiles = new Set(deletingFiles).add(detection.File_Name);
		try {
			await detections.delete(detection.File_Name, auth.getCredentials());
			allDetections = allDetections.filter((item) => item.File_Name !== detection.File_Name);
			total = Math.max(0, total - 1);
			hasMore = allDetections.length < total;
			toasts.show('Detection deleted', 'success');
		} catch (e: any) {
			if (e?.status === 401) {
				auth.logout();
				showLoginModal = true;
			} else {
				console.error('Failed to delete detection:', e);
				toasts.show('Failed to delete detection', 'error');
			}
		} finally {
			const next = new Set(deletingFiles);
			next.delete(detection.File_Name);
			deletingFiles = next;
		}
	}

	async function shiftDetection(detection: Detection) {
		if (!(await requireAuth())) return;

		shiftingFiles = new Set(shiftingFiles).add(detection.File_Name);
		try {
			await media.createShifted(
				detection.Date,
				detection.Sci_Name,
				detection.File_Name,
				auth.getCredentials()
			);
			toasts.show('Shifted audio created', 'success');
		} catch (e: any) {
			if (e?.status === 401) {
				auth.logout();
				showLoginModal = true;
			} else {
				console.error('Failed to shift detection:', e);
				toasts.show('Failed to shift audio', 'error');
			}
		} finally {
			const next = new Set(shiftingFiles);
			next.delete(detection.File_Name);
			shiftingFiles = next;
		}
	}

	async function excludeSpecies(detection: Detection) {
		if (!(await requireAuth())) return;
		const removeExisting = confirm(
			`Exclude ${detection.Com_Name} and remove existing detections/recordings now?`
		);
		try {
			await speciesLists.update('exclude', detection.Sci_Name, 'add', auth.getCredentials());
			if (removeExisting) {
				await speciesApi.delete(detection.Sci_Name, auth.getCredentials());
				allDetections = allDetections.filter((item) => item.Sci_Name !== detection.Sci_Name);
				total = allDetections.length;
				await loadSpeciesOptions();
				toasts.show('Species excluded and existing data removed', 'success');
			} else {
				toasts.show('Species added to Exclude list', 'success');
			}
		} catch (e: any) {
			if (e?.status === 401) {
				auth.logout();
				showLoginModal = true;
			} else {
				console.error('Failed to exclude species:', e);
				toasts.show('Failed to exclude species', 'error');
			}
		}
	}

	async function handleLogin() {
		const result = await verifyPasswordLogin(passwordInput);
		if (!result.ok) {
			toasts.show(result.message || 'Failed to authenticate', 'error');
			return;
		}

		passwordInput = '';
		showLoginModal = false;
		toasts.show('Authenticated', 'success');
	}

	onMount(async () => {
		const query = new URLSearchParams(window.location.search);
		selectedDate = query.get('date') || todayStr();
		selectedSpecies = query.get('species') || '';
		searchTerm = query.get('search') || '';
		speciesQuery = selectedSpecies || searchTerm;
		newOnDateOnly = query.get('new_on_date') === 'true';
		await loadDates();
		await loadSpeciesOptions();
		await loadDetections(true);
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});
</script>

<svelte:head>
	<title>Review - BirdNET-Pi</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Review</h1>
		<p class="text-gray-600 dark:text-gray-400 mt-1">Triage and clean up detections</p>
	</div>

	<!-- Filters -->
	<div class="card mb-6 p-4">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Review queue</p>
				<p class="text-xs text-gray-500 dark:text-gray-400">{resultLabel}</p>
			</div>
			{#if hasActiveFilters}
				<button type="button" class="btn-ghost btn-sm" on:click={clearAllFilters}>
					Clear all
				</button>
			{/if}
		</div>

		<div class="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_16rem_auto] lg:items-end">
			<!-- Species search -->
			<div>
				<label for="speciesSearch" class="label">Species</label>
				<input
					id="speciesSearch"
					type="text"
					bind:value={speciesQuery}
					on:input={handleSpeciesQueryInput}
					on:change={handleSpeciesQueryCommit}
					list="speciesOptionsList"
					placeholder="Search or choose species..."
					class="input"
				/>
				<datalist id="speciesOptionsList">
					{#each speciesOptions as species}
						<option value={species.Com_Name}>{species.Sci_Name}</option>
					{/each}
				</datalist>
			</div>

			<DatePicker
				id="reviewDate"
				bind:value={selectedDate}
				dates={availableDates}
				includeAll={true}
				allLabel="All"
				on:change={handleDateChange}
			/>

			<div>
				<button
					id="newOnDateOnly"
					type="button"
					role="switch"
					aria-checked={newOnDateOnly}
					aria-label="Only show species first detected on the selected date"
					on:click={() => {
						newOnDateOnly = !newOnDateOnly;
						handleNewOnDateToggle();
					}}
					disabled={!selectedDate}
					class="inline-flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors lg:min-w-44 {newOnDateOnly
						? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
						: 'border-gray-300 bg-white text-gray-600 dark:border-dark-border dark:bg-dark-card dark:text-gray-300'} disabled:cursor-not-allowed disabled:opacity-50"
					title={selectedDate ? 'Show only species first detected on this date' : 'Select a date to enable this filter'}
				>
					<span class="flex flex-col text-left leading-tight">
						<span>Only new species</span>
						<span class="text-xs font-normal opacity-70">{newOnDateOnly ? 'On' : 'Off'}</span>
					</span>
					<span
						class="inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors {newOnDateOnly ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-dark-border'}"
					>
						<span
							class="ml-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform {newOnDateOnly ? 'translate-x-4' : ''}"
						></span>
					</span>
				</button>
			</div>
		</div>

		{#if hasActiveFilters}
			<div class="mt-4 flex flex-wrap gap-2 border-t border-gray-200/80 pt-3 dark:border-dark-border/80">
				{#if selectedDate}
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
						on:click={clearDateFilter}
					>
						<span>Date: {selectedDate}</span>
						<span aria-hidden="true">×</span>
					</button>
				{/if}
				{#if hasSpeciesFilter}
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
						on:click={clearSpeciesQueryFilter}
					>
						<span>Species: {speciesFilterLabel}</span>
						<span aria-hidden="true">×</span>
					</button>
				{/if}
				{#if newOnDateOnly}
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
						on:click={() => {
							newOnDateOnly = false;
							void loadDetections(true);
						}}
					>
						<span>Only new species</span>
						<span aria-hidden="true">×</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Detections grid -->
	{#if loading && allDetections.length === 0}
		<div class="flex items-center justify-center py-12">
			<div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if allDetections.length === 0}
		<div class="card p-8 text-center">
			<p class="text-gray-600 dark:text-gray-400">
				{hasSpeciesFilter ? 'No matching detections found' : 'No detections found'}
			</p>
			{#if hasSpeciesFilter || selectedDate}
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					Try clearing one or more filters to widen the review queue.
				</p>
			{/if}
		</div>
	{:else}
		<div class="detection-masonry">
			{#each allDetections as detection (detection.File_Name)}
				<div class="detection-masonry-item space-y-2 min-w-0">
					<DetectionCard
						{detection}
						href={detectionRecordingsHref(detection)}
					/>
					<div class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm shadow-sm dark:border-dark-border/80 dark:bg-dark-card">
						<a class="btn-primary btn-sm" href={detectionRecordingsHref(detection)}>
							Open in Library
						</a>
						<button
							type="button"
							class="btn-secondary btn-sm"
							on:click={() => shiftDetection(detection)}
							disabled={shiftingFiles.has(detection.File_Name)}
						>
							{shiftingFiles.has(detection.File_Name) ? 'Shifting...' : 'Shift'}
						</button>
						<button
							type="button"
							class="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20"
							on:click={() => excludeSpecies(detection)}
						>
							Exclude
						</button>
						<button
							type="button"
							class="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-900/20"
							on:click={() => deleteDetectionFile(detection)}
							disabled={deletingFiles.has(detection.File_Name)}
						>
							{deletingFiles.has(detection.File_Name) ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Load more -->
		{#if hasMore}
			<div class="mt-6 text-center">
				<button
					on:click={loadMore}
					disabled={loading}
					class="btn-secondary"
				>
					{#if loading}
						<span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
					{/if}
					Load more
				</button>
			</div>
		{/if}
	{/if}
</div>

<Modal bind:open={showLoginModal} title="Authentication Required">
	<form on:submit|preventDefault={handleLogin} class="space-y-4">
		<div>
			<label for="detectionsPassword" class="label">Password</label>
			<input id="detectionsPassword" type="password" bind:value={passwordInput} class="input" placeholder="Enter password" />
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" on:click={() => (showLoginModal = false)} class="btn-secondary">Cancel</button>
			<button type="submit" class="btn-primary">Log in</button>
		</div>
	</form>
</Modal>
