<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { detections, health, species as speciesApi, system as systemApi, type Detection, type DetectionStats, type SpeciesSummary, type RangeChartData } from '$lib/api';
	import { DashboardSummary, DetectionCard, DiscoveryNote, ExternalLinks, LiveFieldWindow, Modal } from '$lib/components';
	import { buildActivitySegments, buildDiscoveryPreview, isFirstStationRecord, latestDetection as selectLatestDetection } from '$lib/dashboard';
	import { auth, setSiteIdentity, siteName, toasts } from '$lib/stores';

	let stats: DetectionStats | null = null;
	let topSpeciesToday: SpeciesSummary[] = [];
	let topSpeciesAllTime: SpeciesSummary[] = [];
	let topSpeciesMode: 'today' | 'all' = 'today';
	let topSpeciesExpanded = false;

	const TOP_SPECIES_PREVIEW = 6;
	let loading = true;
	let refreshInterval: ReturnType<typeof setInterval>;

	let hourlyData: RangeChartData | null = null;
	type DetectionGroup = {
		sciName: string;
		comName: string;
		latest: Detection;
		count: number;
		detections: Detection[];
	};
	let groupedDetections: DetectionGroup[] = [];
	let newSpeciesTodayDetections: Detection[] = [];
	let newSpeciesTodaySet: Set<string> = new Set();
	let liveAudioUrl = '';
	let liveAudioExpiresAt = '';
	let liveAudioLoading = false;
	let liveAudioVisible = false;
	let showLiveAudioLoginModal = false;
	let liveAudioPassword = '';
	let liveAudioElement: HTMLAudioElement | null = null;

	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function groupLatest(items: Detection[]): DetectionGroup[] {
		const grouped = new Map<string, DetectionGroup>();
		for (const detection of items) {
			const existing = grouped.get(detection.Sci_Name);
			if (existing) {
				existing.count += 1;
				existing.detections.push(detection);
			} else {
				grouped.set(detection.Sci_Name, {
					sciName: detection.Sci_Name,
					comName: detection.Com_Name,
					latest: detection,
					count: 1,
					detections: [detection],
				});
			}
		}
		return Array.from(grouped.values());
	}

	function detectionTimestamp(detection: Detection): number {
		return new Date(`${detection.Date}T${detection.Time}`).getTime();
	}

	function sortDetectionGroups(groups: DetectionGroup[], pinnedSpecies: Set<string>): DetectionGroup[] {
		return [...groups].sort((a, b) => {
			const aPinned = pinnedSpecies.has(a.sciName);
			const bPinned = pinnedSpecies.has(b.sciName);
			if (aPinned !== bPinned) return aPinned ? -1 : 1;
			return detectionTimestamp(b.latest) - detectionTimestamp(a.latest);
		});
	}

	function uniqueDetections(items: Detection[]): Detection[] {
		const byKey = new Map<string, Detection>();
		for (const detection of items) {
			const key = `${detection.Date}|${detection.Time}|${detection.Sci_Name}|${detection.File_Name}`;
			if (!byKey.has(key)) byKey.set(key, detection);
		}
		return Array.from(byKey.values());
	}

	function isPinnedNewSpecies(sciName: string): boolean {
		return newSpeciesTodaySet.has(sciName);
	}

	function detectionsHref(detection: Detection, options?: { newOnDate?: boolean }): string {
		const params = new URLSearchParams({
			date: detection.Date,
			species: detection.Sci_Name,
		});
		if (options?.newOnDate) params.set('new_on_date', 'true');
		return `/detections?${params.toString()}`;
	}

	function insightsHref(scope: string): string {
		if (scope === 'species_today') return '/species?date=today';
		if (scope === 'all_species') return '/species';
		const params = new URLSearchParams({
			mode: 'day',
			date: todayStr(),
			scope,
		});
		return `/history?${params.toString()}`;
	}

	$: displayedTopSpecies = topSpeciesMode === 'today' ? topSpeciesToday : topSpeciesAllTime;
	$: visibleTopSpecies = topSpeciesExpanded
		? displayedTopSpecies
		: displayedTopSpecies.slice(0, TOP_SPECIES_PREVIEW);
	$: canExpandTopSpecies = displayedTopSpecies.length > TOP_SPECIES_PREVIEW;
	$: topSpeciesTitle = topSpeciesMode === 'today' ? 'Top Species Today' : 'Top Species All Time';
	let featuredDetection: Detection | null = null;

	$: activitySegments = buildActivitySegments(hourlyData);
	$: discoveryPreview = buildDiscoveryPreview(newSpeciesTodayDetections);
	$: featuredIsFirstStationRecord = featuredDetection
		? isFirstStationRecord(featuredDetection.Sci_Name, newSpeciesTodaySet)
		: false;

	function setTopSpeciesMode(mode: 'today' | 'all') {
		topSpeciesMode = mode;
		topSpeciesExpanded = false;
	}

	async function loadData() {
		if (typeof document !== 'undefined' && document.hidden) return;

		try {
			const today = todayStr();
			const [statsData, detectionsData, newSpeciesData, infoData, speciesTodayData, speciesAllTimeData, hourly] = await Promise.all([
				detections.stats(),
				detections.today({ limit: 24 }),
				detections.newSpeciesToday(),
				health.info(),
				speciesApi.list({ sort: 'count', date: today }),
				speciesApi.list({ sort: 'count' }),
				detections.chartDataRange({ start: today, end: today, group_by: 'hour' }),
			]);

			const pinnedSpecies = new Set(newSpeciesData.map((detection) => detection.Sci_Name));
			const mergedDetections = uniqueDetections([...newSpeciesData, ...detectionsData.detections]);
			featuredDetection = selectLatestDetection(mergedDetections);

			stats = statsData;
			newSpeciesTodayDetections = newSpeciesData;
			newSpeciesTodaySet = pinnedSpecies;
			groupedDetections = sortDetectionGroups(groupLatest(mergedDetections), pinnedSpecies);
			setSiteIdentity({
				siteName: infoData.site_name,
				customImage: infoData.custom_image,
				customImageTitle: infoData.custom_image_title,
			});
			topSpeciesToday = speciesTodayData.species;
			topSpeciesAllTime = speciesAllTimeData.species;
			topSpeciesExpanded = false;
			hourlyData = hourly;
		} catch (e) {
			console.error('Failed to load data:', e);
			toasts.show('Failed to load data', 'error');
		} finally {
			loading = false;
		}
	}

	function clearLiveAudio() {
		liveAudioVisible = false;
		liveAudioUrl = '';
		liveAudioExpiresAt = '';
		if (liveAudioElement) {
			liveAudioElement.pause();
			liveAudioElement.load();
		}
	}

	async function requestLiveAudioUrl(): Promise<boolean> {
		liveAudioLoading = true;
		try {
			const stream = await systemApi.liveStreamUrl(auth.getCredentials());
			liveAudioUrl = stream.url;
			liveAudioExpiresAt = stream.expires_at;
			liveAudioVisible = true;
			return true;
		} catch (error: any) {
			if (error?.status === 401) {
				auth.logout();
				showLiveAudioLoginModal = true;
				toasts.show('Authentication required for live audio', 'warning');
			} else {
				console.error('Failed to prepare live audio:', error);
				toasts.show('Live audio is unavailable', 'error');
			}
			return false;
		} finally {
			liveAudioLoading = false;
		}
	}

	async function openLiveAudio() {
		if (!$auth.isAuthenticated) {
			showLiveAudioLoginModal = true;
			return;
		}

		await requestLiveAudioUrl();
	}

	async function handleLiveAudioLogin() {
		if (!liveAudioPassword.trim()) return;

		auth.login(liveAudioPassword);
		const ready = await requestLiveAudioUrl();
		if (ready) {
			showLiveAudioLoginModal = false;
			liveAudioPassword = '';
			toasts.show('Authenticated for live audio', 'success');
		} else {
			auth.logout();
		}
	}

	let visibilityHandler: (() => void) | undefined;

	onMount(() => {
		void loadData();
		refreshInterval = setInterval(() => {
			if (document.hidden) return;
			void loadData();
		}, 60000);

		visibilityHandler = () => {
			if (!document.hidden) void loadData();
		};
		document.addEventListener('visibilitychange', visibilityHandler);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
		if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
		if (liveAudioElement) {
			liveAudioElement.pause();
		}
	});
</script>

<svelte:head>
	<title>{$siteName} - Dashboard</title>
</svelte:head>

<div class="page-shell overflow-x-hidden">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else}
		<div class="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
			<LiveFieldWindow
				detection={featuredDetection}
				firstStationRecord={featuredIsFirstStationRecord}
				{activitySegments}
				activityHref={insightsHref('today')}
			/>
			<div class="space-y-4">
				<DashboardSummary {stats} />
				<DiscoveryNote discovery={discoveryPreview} />
			</div>
		</div>

		<!-- Top Species -->
		<div class="card mb-8">
				<div class="card-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-3">
						<h3 class="font-semibold text-gray-900 dark:text-gray-100">{topSpeciesTitle}</h3>
						<div class="inline-flex rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden text-xs">
							<button
								type="button"
								class="px-3 py-1 {topSpeciesMode === 'today' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300'}"
								on:click={() => setTopSpeciesMode('today')}
							>
								Today
							</button>
							<button
								type="button"
								class="px-3 py-1 {topSpeciesMode === 'all' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300'}"
								on:click={() => setTopSpeciesMode('all')}
							>
								All time
							</button>
						</div>
					</div>
					<div class="flex items-center gap-3">
						{#if canExpandTopSpecies}
							<button
								type="button"
								class="text-primary-600 dark:text-primary-400 hover:underline text-sm"
								on:click={() => (topSpeciesExpanded = !topSpeciesExpanded)}
							>
								{topSpeciesExpanded ? 'Show less' : `Show all ${displayedTopSpecies.length}`}
							</button>
						{/if}
					</div>
				</div>
				{#if displayedTopSpecies.length === 0}
					<div class="card-body text-center py-8">
						<svg class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-gray-500 dark:text-gray-400">
							{topSpeciesMode === 'today' ? 'No species detected today yet' : 'No species detected yet'}
						</p>
						<p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
							{topSpeciesMode === 'today' ? 'Check back after more detections today' : 'Species will appear here as they are identified'}
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
					{#each visibleTopSpecies as sp, index (sp.Sci_Name)}
							<div class="flex min-w-0 items-start gap-3 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-dark-border">
								<span class="mt-1 w-5 flex-shrink-0 text-right text-xs font-semibold text-gray-400 dark:text-gray-500">
									{index + 1}
								</span>
								<div class="flex-1 min-w-0">
									<div class="flex min-w-0 items-start justify-between gap-3">
										<a href="/species/{encodeURIComponent(sp.Sci_Name)}" class="block min-w-0">
											<p class="font-medium text-gray-900 dark:text-gray-100 truncate hover:underline">{sp.Com_Name}</p>
										</a>
										<a
											href={topSpeciesMode === 'today' ? `/detections?date=${todayStr()}&species=${encodeURIComponent(sp.Sci_Name)}` : `/detections?species=${encodeURIComponent(sp.Sci_Name)}`}
											class="flex-shrink-0 rounded-md bg-primary-50 px-2 py-0.5 text-sm font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-200 dark:hover:bg-primary-900/50"
											aria-label={`${sp.Count} ${sp.Count === 1 ? 'detection' : 'detections'} for ${sp.Com_Name}`}
										>
											{sp.Count}
										</a>
									</div>
									<a href="/species/{encodeURIComponent(sp.Sci_Name)}" class="block min-w-0">
										<p class="text-sm text-gray-500 dark:text-gray-400 italic truncate">{sp.Sci_Name}</p>
									</a>
									<div class="mt-1">
										<ExternalLinks sciName={sp.Sci_Name} comName={sp.Com_Name} compact={true} />
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
		</div>

		<!-- Recent Species -->
		<div class="mb-8">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
						Recent Species
					</h2>
					{#if groupedDetections.length > 0}
						<span class="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-dark-nav dark:text-gray-300">
							{groupedDetections.length} species
						</span>
					{/if}
				</div>
				<a href="/detections" class="text-primary-600 dark:text-primary-400 hover:underline text-sm">
					Open Review →
				</a>
			</div>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Most recent recording for each species. First station records are highlighted.
			</p>

			{#if groupedDetections.length === 0}
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
				<div class="grid gap-3 md:grid-cols-2">
					{#each groupedDetections as group (group.sciName)}
						<DetectionCard
							detection={group.latest}
							showDate={false}
							href={detectionsHref(group.latest, { newOnDate: isPinnedNewSpecies(group.sciName) })}
							allowSpectrogramExpand={false}
							tagLabel={isPinnedNewSpecies(group.sciName) ? 'First station record' : null}
							groupedCount={group.count}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<div class="card p-4 space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Explore more</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">Open historical files, trend analysis, or listen live</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<a href="/recordings" class="btn-secondary btn-sm">Open Library</a>
					<a href="/history" class="btn-secondary btn-sm">Open Insights</a>
					<button class="btn-secondary btn-sm" on:click={openLiveAudio} disabled={liveAudioLoading}>
						{#if liveAudioLoading}
							<span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
						{/if}
						Listen Live
					</button>
				</div>
			</div>
			{#if liveAudioVisible && liveAudioUrl}
				<div class="rounded-lg border border-gray-200 dark:border-dark-border p-3">
					<div class="flex flex-wrap items-center justify-between gap-3 mb-2">
						<div>
							<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Live Audio</p>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								Access expires at {new Date(liveAudioExpiresAt).toLocaleTimeString()}
							</p>
						</div>
						<button class="btn-secondary btn-sm" on:click={clearLiveAudio}>Hide</button>
					</div>
					<audio bind:this={liveAudioElement} class="w-full" controls preload="none" src={liveAudioUrl}></audio>
				</div>
			{/if}
		</div>
	{/if}
</div>

<Modal bind:open={showLiveAudioLoginModal} title="Live Audio Authentication">
	<form on:submit|preventDefault={handleLiveAudioLogin} class="space-y-4">
		<div>
			<label for="liveAudioPassword" class="label">Password</label>
			<input
				id="liveAudioPassword"
				type="password"
				bind:value={liveAudioPassword}
				class="input"
				placeholder="Enter password"
			/>
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" on:click={() => (showLiveAudioLoginModal = false)} class="btn-secondary">
				Cancel
			</button>
			<button type="submit" class="btn-primary" disabled={liveAudioLoading}>
				{#if liveAudioLoading}
					<span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
				{/if}
				Authenticate
			</button>
		</div>
	</form>
</Modal>
