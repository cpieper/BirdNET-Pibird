<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let id = 'date';
	export let label = 'Date';
	export let value = '';
	export let dates: string[] = [];
	export let includeAll = false;
	export let allLabel = 'All dates';
	export let disabled = false;

	const dispatch = createEventDispatcher<{ change: string }>();

	$: dateListId = `${id}-available-dates`;
	$: minDate = dates.length > 0 ? dates.reduce((min, date) => (date < min ? date : min), dates[0]) : '';
	$: maxDate = dates.length > 0 ? dates.reduce((max, date) => (date > max ? date : max), dates[0]) : '';

	function commit(nextValue: string) {
		value = nextValue;
		dispatch('change', value);
	}

	function handleDateChange(event: Event) {
		commit((event.currentTarget as HTMLInputElement).value);
	}
</script>

<div>
	<div class="mb-1 flex items-center justify-between gap-2">
		<label for={id} class="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
		{#if includeAll}
			<button
				type="button"
				class="rounded-md px-2 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {value
					? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-dark-hover dark:hover:text-gray-200'
					: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'}"
				aria-pressed={!value}
				{disabled}
				on:click={() => commit('')}
			>
				{allLabel}
			</button>
		{/if}
	</div>

	<input
		{id}
		type="date"
		bind:value
		on:change={handleDateChange}
		list={dateListId}
		min={minDate || undefined}
		max={maxDate || undefined}
		class="input pr-3"
		{disabled}
	/>

	<datalist id={dateListId}>
		{#each dates as date}
			<option value={date}></option>
		{/each}
	</datalist>
</div>
