<script lang="ts">
	import { onMount } from 'svelte';
	import { system as systemApi, type ServiceStatus, type SystemInfo } from '$lib/api';
	import { auth, toasts } from '$lib/stores';
	import { Modal } from '$lib/components';

	let systemInfo: SystemInfo | null = null;
	let services: ServiceStatus[] = [];
	let loading = true;
	let showLoginModal = false;
	let passwordInput = '';
	let actionLoading: Record<string, boolean> = {};

	async function loadData() {
		loading = true;
		try {
			const [infoData, servicesData] = await Promise.all([
				systemApi.info(),
				systemApi.services(),
			]);
			systemInfo = infoData;
			services = servicesData.services;
		} catch (e) {
			console.error('Failed to load system info:', e);
			toasts.show('Failed to load system information', 'error');
		} finally {
			loading = false;
		}
	}

	async function controlService(service: string, action: string) {
		if (!$auth.isAuthenticated) {
			showLoginModal = true;
			return;
		}

		actionLoading[service] = true;
		try {
			await systemApi.controlService(service, action, $auth.getCredentials());
			toasts.show(`Service ${service} ${action} successful`, 'success');
			// Refresh services
			const result = await systemApi.services();
			services = result.services;
		} catch (e: any) {
			if (e.status === 401) {
				auth.logout();
				showLoginModal = true;
			} else {
				toasts.show(`Failed to ${action} ${service}`, 'error');
			}
		} finally {
			actionLoading[service] = false;
		}
	}

	async function restartAllServices() {
		if (!$auth.isAuthenticated) {
			showLoginModal = true;
			return;
		}

		actionLoading['all'] = true;
		try {
			await systemApi.restartServices($auth.getCredentials());
			toasts.show('Services restart initiated', 'success');
			// Refresh after a delay
			setTimeout(loadData, 3000);
		} catch (e: any) {
			if (e.status === 401) {
				auth.logout();
				showLoginModal = true;
			} else {
				toasts.show('Failed to restart services', 'error');
			}
		} finally {
			actionLoading['all'] = false;
		}
	}

	async function rebootSystem() {
		if (!$auth.isAuthenticated) {
			showLoginModal = true;
			return;
		}

		if (!confirm('Are you sure you want to reboot the system?')) return;

		try {
			await systemApi.reboot($auth.getCredentials());
			toasts.show('System reboot initiated', 'info');
		} catch (e: any) {
			if (e.status === 401) {
				auth.logout();
				showLoginModal = true;
			} else {
				toasts.show('Failed to reboot', 'error');
			}
		}
	}

	function handleLogin() {
		auth.login(passwordInput);
		showLoginModal = false;
	}

	onMount(loadData);
</script>

<svelte:head>
	<title>System - BirdNET-Pi</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">System</h1>
		<p class="text-gray-600 dark:text-gray-400 mt-1">System information and service controls</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
		</div>
	{:else}
		<!-- System Info -->
		<div class="card mb-6">
			<div class="card-header">
				<h2 class="font-semibold text-gray-900 dark:text-gray-100">System Information</h2>
			</div>
			<div class="card-body">
				<div class="grid md:grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">Version</p>
						<p class="font-mono text-gray-900 dark:text-gray-100">{systemInfo?.version || 'Unknown'}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">Uptime</p>
						<p class="text-gray-900 dark:text-gray-100">{systemInfo?.uptime || 'Unknown'}</p>
					</div>
					{#if systemInfo?.disk_usage}
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">Disk Usage</p>
							<p class="text-gray-900 dark:text-gray-100">
								{systemInfo.disk_usage.used} / {systemInfo.disk_usage.total} ({systemInfo.disk_usage.percent})
							</p>
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">Available</p>
							<p class="text-gray-900 dark:text-gray-100">{systemInfo.disk_usage.available}</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Services -->
		<div class="card mb-6">
			<div class="card-header flex items-center justify-between">
				<h2 class="font-semibold text-gray-900 dark:text-gray-100">Services</h2>
				<button
					on:click={restartAllServices}
					disabled={actionLoading['all']}
					class="btn-secondary btn-sm"
				>
					{#if actionLoading['all']}
						<span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
					{/if}
					Restart All
				</button>
			</div>
			<div class="divide-y divide-gray-200 dark:divide-dark-border">
				{#each services as service}
					<div class="px-6 py-4 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<span
								class="w-3 h-3 rounded-full"
								class:bg-green-500={service.active}
								class:bg-red-500={!service.active}
							/>
							<div>
								<p class="font-medium text-gray-900 dark:text-gray-100">{service.name}</p>
								<p class="text-sm text-gray-500 dark:text-gray-400">
									{service.status} • {service.enabled ? 'Enabled' : 'Disabled'}
								</p>
							</div>
						</div>
						<div class="flex gap-2">
							{#if service.active}
								<button
									on:click={() => controlService(service.name, 'restart')}
									disabled={actionLoading[service.name]}
									class="btn-secondary btn-sm"
								>
									Restart
								</button>
								<button
									on:click={() => controlService(service.name, 'stop')}
									disabled={actionLoading[service.name]}
									class="btn-danger btn-sm"
								>
									Stop
								</button>
							{:else}
								<button
									on:click={() => controlService(service.name, 'start')}
									disabled={actionLoading[service.name]}
									class="btn-primary btn-sm"
								>
									Start
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- System Actions -->
		<div class="card">
			<div class="card-header">
				<h2 class="font-semibold text-gray-900 dark:text-gray-100">System Actions</h2>
			</div>
			<div class="card-body">
				<div class="flex flex-wrap gap-4">
					<button on:click={rebootSystem} class="btn-danger">
						Reboot System
					</button>
					<a href="/api/system/backup" class="btn-secondary">
						Download Backup
					</a>
				</div>
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">
					Warning: These actions may interrupt bird detection temporarily.
				</p>
			</div>
		</div>
	{/if}
</div>

<!-- Login Modal -->
<Modal bind:open={showLoginModal} title="Authentication Required">
	<form on:submit|preventDefault={handleLogin} class="space-y-4">
		<div>
			<label for="password" class="label">Password</label>
			<input
				id="password"
				type="password"
				bind:value={passwordInput}
				class="input"
				placeholder="Enter password"
				autofocus
			/>
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" on:click={() => showLoginModal = false} class="btn-secondary">
				Cancel
			</button>
			<button type="submit" class="btn-primary">
				Log in
			</button>
		</div>
	</form>
</Modal>
