import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createClassComponent } from 'svelte/legacy';
import Review from '../src/routes/detections/+page.svelte';
import { detections, species } from '../src/lib/api';

let component: ReturnType<typeof createClassComponent>;
const options = [
    { Com_Name: 'Downy Woodpecker', Sci_Name: 'Dryobates pubescens', Count: 3, MaxConfidence: .9, Date: '2026-09-29', Time: '10:00:00', File_Name: 'downy.mp3' },
    { Com_Name: 'Red-bellied Woodpecker', Sci_Name: 'Melanerpes carolinus', Count: 2, MaxConfidence: .8, Date: '2026-09-29', Time: '09:00:00', File_Name: 'red-bellied.mp3' },
];
beforeEach(async () => {
    vi.spyOn(detections, 'dates').mockResolvedValue({ dates: ['2026-09-29'] });
    vi.spyOn(species, 'list').mockResolvedValue({ species: options, total: 2 });
    vi.spyOn(detections, 'list').mockResolvedValue({ detections: [], total: 0, limit: 20, offset: 0 });
    component = createClassComponent({ component: Review, target: document.body });
    flushSync();
    await vi.waitFor(() => expect(detections.list).toHaveBeenCalled());
});
afterEach(() => { component?.$destroy(); document.body.innerHTML = ''; });
function search() {
    const input = document.querySelector('#speciesSearch') as HTMLInputElement;
    input.focus();
    input.value = 'woodpecker';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    return input;
}
function key(input: HTMLInputElement, value: string) {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
    flushSync();
}

test('ArrowDown and Enter select an exact species and keep focus on the input', () => {
    const input = search();
    key(input, 'ArrowDown');
    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)?.textContent).toContain('Downy Woodpecker');
    key(input, 'Enter');
    expect(input.value).toBe('Downy Woodpecker');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(input);
    expect(detections.list).toHaveBeenLastCalledWith(expect.objectContaining({ species: 'Dryobates pubescens' }));
});

test('ArrowUp starts at the last suggestion and Escape dismisses without choosing it', () => {
    const input = search();
    key(input, 'ArrowUp');
    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)?.textContent).toContain('Red-bellied Woodpecker');
    key(input, 'Escape');
    expect(input.value).toBe('woodpecker');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
});

test('pointer selection still applies the exact species filter', () => {
    const input = search();
    (document.querySelector('[role="option"]') as HTMLButtonElement).click();
    flushSync();
    expect(input.value).toBe('Downy Woodpecker');
    expect(detections.list).toHaveBeenLastCalledWith(expect.objectContaining({ species: 'Dryobates pubescens' }));
});


test('keyboard navigation brings the active option into the scrollable list viewport', async () => {
    const scrolledIds: string[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
        expect(options).toEqual({ block: 'nearest' });
        scrolledIds.push(this.id);
    };
    try {
        const input = search();
        key(input, 'ArrowUp');
        await vi.waitFor(() => expect(scrolledIds).toEqual(['species-suggestion-1']));
    } finally {
        Element.prototype.scrollIntoView = original;
    }
});
