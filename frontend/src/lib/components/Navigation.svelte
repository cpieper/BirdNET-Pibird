<script lang="ts">
	import { onMount } from 'svelte';
	import { health, system as systemApi } from '$lib/api';
	import { page } from '$app/stores';
	import { customImage, setSiteIdentity, siteName } from '$lib/stores';
	import NavIcon, { type NavIconName } from './NavIcon.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	const SERVICE_NAME = 'PiBird';
	const navItems: { href: string; label: string; icon: NavIconName }[] = [
		{ href: '/', label: 'Dashboard', icon: 'home' },
		{ href: '/detections', label: 'Review', icon: 'inspect' },
		{ href: '/species', label: 'Species', icon: 'species' },
		{ href: '/history', label: 'Insights', icon: 'insights' },
		{ href: '/recordings', label: 'Library', icon: 'library' },
	];

	let statusState: 'online' | 'degraded' | 'offline' = 'online';
	let statusText = 'Checking';
	let statusTimer: ReturnType<typeof setInterval> | undefined;
	let visibilityHandler: (() => void) | undefined;
	let logoImageFailed = false;
	let stationLatitude: number | null = null;
	let stationLongitude: number | null = null;

	$: currentPath = $page.url.pathname;
	$: logoSrc = $customImage && !logoImageFailed ? $customImage : '/bird.png';
	$: stationLocation = formatStationLocation(stationLatitude, stationLongitude);
	$: headerTitle = formatHeaderTitle($siteName);
	$: if ($customImage) logoImageFailed = false;

	function formatHeaderTitle(instanceName: string): string {
		const name = instanceName.trim();
		if (!name || name.toLowerCase() === SERVICE_NAME.toLowerCase()) return SERVICE_NAME;
		return `${SERVICE_NAME} - ${name}`;
	}

	function formatStationLocation(lat: number | null, lon: number | null): string {
		if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
			return '';
		}
		if (lat === 0 && lon === 0) return '';
		return `near ${lat.toFixed(1)}, ${lon.toFixed(1)}`;
	}

	async function refreshStationInfo() {
		try {
			const info = await health.info();
			stationLatitude = info.latitude;
			stationLongitude = info.longitude;
			setSiteIdentity({
				siteName: info.site_name,
				customImage: info.custom_image,
				customImageTitle: info.custom_image_title,
			});
		} catch {
			stationLatitude = null;
			stationLongitude = null;
		}
	}

	async function refreshStatus() {
		try {
			const status = await systemApi.publicStatus();
			statusState = status.status === 'degraded' ? 'degraded' : 'online';
			statusText = statusState === 'degraded' ? 'Degraded' : 'Online';
		} catch {
			statusState = 'offline';
			statusText = 'Offline';
		}
	}

	onMount(() => {
		void refreshStationInfo();
		void refreshStatus();
		statusTimer = setInterval(() => {
			if (document.hidden) return;
			void refreshStatus();
		}, 60000);

		visibilityHandler = () => {
			if (!document.hidden) void refreshStatus();
		};
		document.addEventListener('visibilitychange', visibilityHandler);

		return () => {
			if (statusTimer) clearInterval(statusTimer);
			if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
		};
	});
</script>

<!-- Desktop Navigation -->
<nav class="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b border-primary-900/20 bg-primary-800 shadow-sm dark:border-black/30 dark:bg-dark-nav z-30 overflow-hidden">
	<div class="relative container mx-auto px-4 flex items-center justify-between">
		<!-- Logo -->
		<a href="/" class="flex items-center gap-3 text-white">
			<img
				src={logoSrc}
				alt="{headerTitle} logo"
				class="w-8 h-8 rounded-md object-cover ring-1 ring-white/30"
				on:error={() => (logoImageFailed = true)}
			/>
			<span class="flex min-w-0 flex-col">
				<span class="max-w-64 truncate text-lg font-bold leading-tight">{headerTitle}</span>
				<span class="hidden max-w-72 truncate text-[11px] font-medium uppercase tracking-wide text-white/70 lg:block">
					Live station{stationLocation ? ` · ${stationLocation}` : ''}
				</span>
			</span>
		</a>

		<!-- Navigation Links -->
		<div class="flex items-center gap-1">
			{#each navItems as item}
				<a
					href={item.href}
					aria-current={currentPath === item.href ? 'page' : undefined}
					class="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition-colors {currentPath === item.href
						? 'bg-white/20 text-white'
						: 'text-white/90 hover:text-white hover:bg-white/10'}"
				>
					<NavIcon name={item.icon} className="h-4 w-4" />
					{item.label}
				</a>
			{/each}

			<a
				href="/status"
				aria-current={currentPath === '/status' ? 'page' : undefined}
				class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 {currentPath === '/status'
					? 'bg-white/20 text-white'
					: 'text-white/90 hover:text-white hover:bg-white/10'}"
				aria-label="Server status"
				title={`Server status: ${statusText}`}
			>
				<span
					class="w-2.5 h-2.5 rounded-full"
					class:bg-green-400={statusState === 'online'}
					class:bg-amber-400={statusState === 'degraded'}
					class:bg-red-400={statusState === 'offline'}></span>
				<span>Status</span>
			</a>

			<!-- Theme Toggle -->
			<ThemeToggle />
		</div>
	</div>
</nav>

<!-- Mobile Navigation -->
<nav class="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-primary-900/20 bg-primary-800 shadow-sm dark:border-black/30 dark:bg-dark-nav z-30 overflow-hidden">
	<div class="relative h-full px-4 flex items-center justify-between">
		<a href="/" class="flex items-center gap-2 text-white">
			<img
				src={logoSrc}
				alt="{headerTitle} logo"
				class="w-7 h-7 rounded-md object-cover ring-1 ring-white/30"
				on:error={() => (logoImageFailed = true)}
			/>
			<span class="flex min-w-0 flex-col">
				<span class="max-w-[11rem] truncate text-base font-bold leading-tight">{headerTitle}</span>
				<span class="max-w-[11rem] truncate text-[10px] font-medium uppercase tracking-wide text-white/70">
					Live station{stationLocation ? ` · ${stationLocation}` : ''}
				</span>
			</span>
		</a>

		<div class="flex items-center gap-2">
			<a
				href="/status"
				aria-current={currentPath === '/status' ? 'page' : undefined}
				class="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white"
				aria-label={`System status: ${statusText}`}
				title={`System status: ${statusText}`}
			>
				<span
					class="h-2.5 w-2.5 rounded-full"
					class:bg-green-400={statusState === 'online'}
					class:bg-amber-400={statusState === 'degraded'}
					class:bg-red-400={statusState === 'offline'}></span>
				<span class="hidden sm:inline">Status</span>
			</a>
			<ThemeToggle />
		</div>
	</div>
</nav>

<!-- Mobile Bottom Navigation -->
<nav class="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-dark-nav border-t border-gray-200 dark:border-dark-border z-30">
	<div class="h-full grid grid-cols-5">
		{#each navItems as item}
			<a
				href={item.href}
				aria-current={currentPath === item.href ? 'page' : undefined}
				class="flex flex-col items-center justify-center {currentPath === item.href
					? 'text-primary-600 dark:text-primary-400'
					: 'text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'}"
			>
				<NavIcon name={item.icon} className="h-6 w-6" />
				<span class="text-xs mt-1">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
