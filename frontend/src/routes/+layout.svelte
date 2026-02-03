<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { toasts } from '$lib/stores';
</script>

<div class="min-h-screen bg-gray-100 dark:bg-dark-body">
	<Navigation />
	
	<!-- Main content with padding for fixed nav -->
	<main class="pt-16 md:pt-16 pb-20 md:pb-6">
		<slot />
	</main>

	<!-- Toast notifications -->
	<div class="fixed bottom-20 md:bottom-4 right-4 z-50 space-y-2">
		{#each $toasts as toast (toast.id)}
			<Toast {toast} on:dismiss={() => toasts.dismiss(toast.id)} />
		{/each}
	</div>
</div>
