// @ts-nocheck
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPlaybackTime, normalizeSelection, pointerTime } from '../src/lib/playbackTimeline.ts';

test('rendered slow playback maps to original recording seconds using measured durations', () => {
 assert.equal(mapPlaybackTime(12, 24, 12), 6);
 assert.equal(mapPlaybackTime(6, 12, 24), 12);
 assert.equal(mapPlaybackTime(6, 12, 12), 6);
});
test('timeline mapping clamps bounds and handles unavailable metadata', () => {
 assert.equal(mapPlaybackTime(-1, 24, 12), 0);
 assert.equal(mapPlaybackTime(25, 24, 12), 12);
 assert.equal(mapPlaybackTime(3, 0, 12), 0);
 assert.equal(mapPlaybackTime(3, Infinity, 12), 0);
});
test('plot seeking respects its own bounds and touch positions', () => {
 assert.equal(pointerTime(100, 100, 600, 12), 0);
 assert.equal(pointerTime(400, 100, 600, 12), 6);
 assert.equal(pointerTime(700, 100, 600, 12), 12);
 assert.equal(pointerTime(900, 100, 600, 12), 12);
});
test('selection can be dragged in either direction and stays on the recording', () => {
 assert.deepEqual(normalizeSelection(9, 3, 12), { start: 3, end: 9 });
 assert.deepEqual(normalizeSelection(-2, 20, 12), { start: 0, end: 12 });
 assert.equal(normalizeSelection(3, 3, 12), null);
});
