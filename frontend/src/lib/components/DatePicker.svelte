<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let id = 'date';
	export let label = 'Date';
	export let value = '';
	export let dates: string[] = [];
	export let includeAll = false;
	export let allLabel = 'All dates';
	export let allAriaLabel = 'All dates';
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
	<div class="mb-1">
		<label for={id} class="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
	</div>

	<div class="flex">
		<input
			{id}
			type="date"
			bind:value
			on:change={handleDateChange}
			list={dateListId}
			min={minDate || undefined}
			max={maxDate || undefined}
			class="input min-w-0 flex-1 pr-3 {includeAll ? 'rounded-r-none border-r-0' : ''}"
			{disabled}
		/>
		{#if includeAll}
			<button
				type="button"
				class="inline-flex items-center justify-center rounded-r-lg border border-gray-300 px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-border {value
					? 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-hover dark:hover:text-gray-100'
					: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'}"
				aria-pressed={!value}
				aria-label={allAriaLabel}
				{disabled}
				on:click={() => commit('')}
			>
				{allLabel}
			</button>
		{/if}
	</div>

	<datalist id={dateListId}>
		{#each dates as date}
			<option value={date}></option>
		{/each}
	</datalist>
</div>
