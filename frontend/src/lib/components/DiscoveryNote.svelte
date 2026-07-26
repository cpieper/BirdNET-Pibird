<script lang="ts">
	import type { DiscoveryPreview } from '$lib/dashboard';

	export let discovery: DiscoveryPreview;
</script>

{#if discovery.total > 0}
	<section class="rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/70 dark:bg-amber-900/20">
		<div class="flex items-start justify-between gap-3">
			<div>
				<p class="text-sm font-semibold text-amber-900 dark:text-amber-100">Discovery note</p>
				<p class="mt-1 text-xs text-amber-800/80 dark:text-amber-100/75">
					First-ever records at this station today.
				</p>
			</div>
			<a href={discovery.reviewHref} class="text-xs font-semibold text-amber-900 hover:underline dark:text-amber-100">
				View all
			</a>
		</div>
		<div class="mt-3 flex flex-wrap gap-2">
			{#each discovery.visible as detection (detection.Sci_Name)}
				<a
					href="/species/{encodeURIComponent(detection.Sci_Name)}"
					class="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-dark-card dark:text-amber-100 dark:hover:bg-amber-900/40"
				>
					{detection.Com_Name}
				</a>
			{/each}
			{#if discovery.hiddenCount > 0}
				<a href={discovery.reviewHref} class="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-dark-card dark:text-amber-100 dark:hover:bg-amber-900/40">
					+{discovery.hiddenCount} more
				</a>
			{/if}
		</div>
	</section>
{/if}
