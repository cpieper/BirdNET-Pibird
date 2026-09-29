import { afterEach, expect, test, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createClassComponent } from 'svelte/legacy';
import Dashboard from '../src/routes/+page.svelte';
import { detections, health, species, integrations } from '../src/lib/api';

let component: ReturnType<typeof createClassComponent>;
afterEach(() => { component?.$destroy(); document.body.innerHTML = ''; });

test('visible-tab refresh updates totals and both discovery links to the station date', async () => {
    let date = '2026-09-29';
    let count = 10;
    const detection = { Date: date, Time: '12:00:00', Sci_Name: 'Dryobates pubescens',
        Com_Name: 'Downy Woodpecker', Confidence: .9, Lat: 0, Lon: 0, Cutoff: .7,
        Week: 40, Sens: 1, Overlap: 0, File_Name: 'downy.mp3' };
    vi.spyOn(detections, 'stats').mockImplementation(async () => ({ total_count: 100,
        todays_count: count, todays_species_tally: 1, species_tally: 2, hour_count: 1, new_species_today: 1 }));
    vi.spyOn(detections, 'today').mockImplementation(async () => ({ detections: [], date }));
    vi.spyOn(detections, 'newSpeciesToday').mockImplementation(async () => [{ ...detection, Date: date }]);
    vi.spyOn(health, 'info').mockResolvedValue({ name: 'Pibird', version: '1', site_name: 'Test station',
        latitude: 0, longitude: 0, model: 'BirdNET', custom_image: '', custom_image_title: '' });
    vi.spyOn(species, 'list').mockResolvedValue({ species: [], total: 0 });
    vi.spyOn(detections, 'chartDataRange').mockResolvedValue({ start: date, end: date, group_by: 'hour',
        total_detections: 10, species_count: 1, buckets: [], top_species: [], species_buckets: [] });
    vi.spyOn(integrations, 'image').mockResolvedValue(null);
    vi.spyOn(integrations, 'speciesLinks').mockRejectedValue(new Error('No external links in fixture'));
    component = createClassComponent({ component: Dashboard, target: document.body });
    flushSync();
    const links = () => [...document.querySelectorAll('a[href*="new_on_date=true"]')];
    await vi.waitFor(() => expect(links().length).toBeGreaterThanOrEqual(2));
    date = '2026-09-30'; count = 1;
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => {
        expect(document.querySelector('a[href="/history?mode=day"] .text-2xl')?.textContent).toBe('1');
        expect(links().every(link => new URL((link as HTMLAnchorElement).href).searchParams.get('date') === '2026-09-30')).toBe(true);
    });
});
