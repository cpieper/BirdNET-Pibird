import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'svelte';
import { createClassComponent } from 'svelte/legacy';
import DashboardSummary from '../src/lib/components/DashboardSummary.svelte';

let component: ReturnType<typeof createClassComponent>;
afterEach(() => { component?.$destroy(); document.body.innerHTML = ''; });
const stats = { todays_count: 10, todays_species_tally: 2, total_count: 100,
    species_tally: 5, hour_count: 3, new_species_today: 1 };

function mountSummary(props: Record<string, unknown>) {
    component = createClassComponent({ component: DashboardSummary, target: document.body, props });
    flushSync();
}
function counters() {
    return [...document.querySelectorAll('.text-2xl')].map(el => el.textContent);
}

test('summary counters follow refreshed station totals without remounting', () => {
    mountSummary({ stats });
    expect(counters()).toEqual(['10', '2', '100', '5']);
    component.$set({ stats: { ...stats, todays_count: 15, todays_species_tally: 3,
        total_count: 105, species_tally: 6 } });
    flushSync();
    expect(counters()).toEqual(['15', '3', '105', '6']);
});

test('discovery link follows the refreshed station date across midnight', () => {
    mountSummary({ stats, date: '2026-09-29' });
    component.$set({ date: '2026-09-30', stats: { ...stats, todays_count: 1 } });
    flushSync();
    const link = document.querySelector('a[href*="new_on_date"]') as HTMLAnchorElement;
    expect(new URL(link.href).searchParams.get('date')).toBe('2026-09-30');
});
