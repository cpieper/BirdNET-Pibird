import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createClassComponent } from 'svelte/legacy';
import AudioPlayer from '../src/lib/components/AudioPlayer.svelte';
import { currentlyPlaying } from '../src/lib/stores';

let component: ReturnType<typeof createClassComponent>;
let mediaDuration = 12;
let paused = true;
beforeEach(() => {
    mediaDuration = 12;
    paused = true;
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ready: true }) }));
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockImplementation(() => mediaDuration);
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(() => paused);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
        if (!paused) { paused = true; this.dispatchEvent(new Event('pause')); }
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
        paused = false;
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
    });
});
afterEach(() => {
    component?.$destroy();
    document.body.innerHTML = '';
    currentlyPlaying.set(null);
    vi.unstubAllGlobals();
});

test.each(['plot seek', 'passage start'])('%s during a slowed-source load replaces the pending seek', async (action) => {
    component = createClassComponent({ component: AudioPlayer, target: document.body, props: {
        src: '/original.wav', spectrogramUrl: '/saved.png', spectrogramPlotUrl: '/plot.png',
        temporalZoomProminent: true,
        temporalZoomUrls: { '0.5': '/slow.mp3' }, temporalZoomPrepareUrls: { '0.5': '/prepare' },
    } });
    flushSync();
    const audio = document.querySelector('audio')!;
    audio.dispatchEvent(new Event('loadedmetadata'));
    document.querySelector('img')!.dispatchEvent(new Event('load'));
    audio.currentTime = 3;
    audio.dispatchEvent(new Event('timeupdate'));
    flushSync();
    if (action === 'passage start') {
        [...document.querySelectorAll('button')].find(button => button.textContent === 'Select Passage')!.click();
        flushSync();
        const start = document.querySelector('input[type="range"]') as HTMLInputElement;
        start.value = '1';
        start.dispatchEvent(new Event('input', { bubbles: true }));
        flushSync();
    }
    const slow = document.querySelector('button[title="Fine: 0.5x"]') as HTMLButtonElement;
    slow.click();
    await vi.waitFor(() => expect(audio.getAttribute('src')).toBe('/slow.mp3'));
    // Metadata for the new source has not arrived, but the original plot is usable.
    if (action === 'plot seek') {
        document.querySelector('[role="slider"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    } else {
        [...document.querySelectorAll('button')].find(button => button.textContent === 'Play Passage')!.click();
    }
    mediaDuration = 24;
    audio.dispatchEvent(new Event('loadedmetadata'));
    flushSync();
    expect(audio.currentTime).toBe(action === 'plot seek' ? 24 : 2);
});
