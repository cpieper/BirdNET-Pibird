// @ts-nocheck
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInsightsView } from '../src/lib/insights.ts';

const data = {
 start: '2026-10-01', end: '2026-10-03', group_by: 'day',
 total_detections: 1450, species_count: 2,
 buckets: [{ period: '2026-10-01', count: 700 }, { period: '2026-10-03', count: 750 }],
 top_species: [],
 species_buckets: [
  { sci_name: 'bird-a', com_name: 'Bird A', counts: [2, 30] },
  { sci_name: 'bird-b', com_name: 'Bird B', counts: [698, 720] },
 ],
};
test('species focus excludes unrelated detections and preserves empty calendar days', () => {
 const view = buildInsightsView(data, new Map([['bird-a', 'Bird A']]), false, false);
 assert.deepEqual(view.periods, ['2026-10-01', '2026-10-02', '2026-10-03']);
 assert.deepEqual(view.series, [{ name: 'Bird A', sciName: 'bird-a', counts: [2, 0, 30] }]);
 assert.deepEqual(view.focusCounts, [2, 0, 30]);
 assert.equal(view.focusTotal, 32);
});
test('Show All restores station context without changing selected species statistics', () => {
 const view = buildInsightsView(data, new Map([['bird-a', 'Bird A']]), true, false);
 assert.deepEqual(view.series[1], { name: 'Other', counts: [698, 0, 720] });
 assert.equal(view.focusTotal, 32);
});
test('an absent selected species stays visible with zero counts', () => {
 const view = buildInsightsView(data, new Map([['missing', 'Missing bird']]), false, false);
 assert.deepEqual(view.series, [{ name: 'Missing bird', sciName: 'missing', counts: [0, 0, 0] }]);
 assert.equal(view.focusTotal, 0);
});
test('Year view aggregates the selected species rather than station totals', () => {
 const view = buildInsightsView(data, new Map([['bird-a', 'Bird A']]), false, true);
 assert.equal(view.periods.length, 12);
 assert.deepEqual(view.series[0].counts, [0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0]);
});
test('multiple selections retain independent count series', () => {
 const view = buildInsightsView(data, new Map([['bird-a', 'Bird A'], ['bird-b', 'Bird B']]), false, false);
 assert.deepEqual(view.series.map(s => s.counts), [[2, 0, 30], [698, 0, 720]]);
 assert.equal(view.focusTotal, 1450);
});
