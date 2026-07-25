<script lang="ts">
	export let name: NavIconName;
	export let className = 'h-5 w-5';
</script>

<script lang="ts" context="module">
	export type NavIconName = 'home' | 'inspect' | 'species' | 'insights' | 'library';
</script>

{#if name === 'home'}
	<svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l9-8 9 8M5 10.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9.5" />
	</svg>
{:else if name === 'inspect'}
	<svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16 16l5 5" />
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10.5h5M10.5 8v5" />
	</svg>
{:else if name === 'species'}
	<svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14.5c3.2-5.2 8.2-7.6 15-7.1-1.2 4.6-4.4 7.1-9.5 7.6" />
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.5 15c1.2 1.7 2.6 3 4.4 4M7 16.5c-.8 1.6-1.9 2.8-3.4 3.5M15.5 9.4h.01" />
	</svg>
{:else if name === 'insights'}
	<svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 19V5M4 19h16" />
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 15l3-4 3 2 4-7" />
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 15h.01M10 11h.01M13 13h.01M17 6h.01" />
	</svg>
{:else if name === 'library'}
	<svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7.5A2.5 2.5 0 015.5 5H10l2 2h6.5A2.5 2.5 0 0121 9.5v7A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-9z" />
	</svg>
{/if}
