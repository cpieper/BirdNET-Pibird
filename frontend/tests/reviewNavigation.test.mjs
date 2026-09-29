import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewDateFromQuery, speciesReviewHref } from '../src/lib/reviewNavigation.js';

test('all-time species links retain all dates and the species filter', () => {
    const href = speciesReviewHref('Turdus migratorius', '');
    const url = new URL(href, 'https://station.example');
    assert.equal(url.pathname, '/detections');
    assert.equal(reviewDateFromQuery(url.searchParams, '2026-09-29'), '');
    assert.equal(url.searchParams.get('species'), 'Turdus migratorius');
});

test('daily species links retain their date', () => {
    const url = new URL(speciesReviewHref('Corvus corax', '2026-09-28'), 'https://station.example');
    assert.equal(reviewDateFromQuery(url.searchParams, '2026-09-29'), '2026-09-28');
});

test('opening Review without a date still defaults to today', () => {
    assert.equal(reviewDateFromQuery(new URLSearchParams(), '2026-09-29'), '2026-09-29');
});
