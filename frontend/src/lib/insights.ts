import type { RangeChartData } from './api';

export interface InsightSeries {
	name: string;
	sciName?: string;
	counts: number[];
}

/** Keep the same calendar timeline for station and species counts. */
export function buildInsightsView(
	data: RangeChartData,
	selected: Map<string, string>,
	showAll: boolean,
	yearly: boolean,
) {
	let periods: (string | number)[] = data.buckets.map(b => b.period);
	if (data.group_by === 'day') {
		periods = [];
		const cursor = new Date(`${data.start}T00:00:00Z`);
		const end = new Date(`${data.end}T00:00:00Z`);
		while (cursor <= end) {
			periods.push(cursor.toISOString().slice(0, 10));
			cursor.setUTCDate(cursor.getUTCDate() + 1);
		}
	}
	const bucketIndex = new Map(data.buckets.map((b, i) => [String(b.period), i]));
	const align = (counts: number[]) => periods.map(p => {
		const i = bucketIndex.get(String(p));
		return i === undefined ? 0 : counts[i] ?? 0;
	});
	let stationCounts = align(data.buckets.map(b => b.count));
	const bySpecies = new Map(data.species_buckets.map(s => [s.sci_name, s]));
	let series: InsightSeries[] = selected.size
		? Array.from(selected, ([sciName, name]) => ({
			name, sciName, counts: align(bySpecies.get(sciName)?.counts ?? []),
		}))
		: [{ name: 'Detections', counts: stationCounts }];
	if (yearly) {
		const monthly = (counts: number[]) => {
			const result = Array<number>(12).fill(0);
			periods.forEach((p, i) => {
				const month = Number(String(p).slice(5, 7)) - 1;
				if (month >= 0 && month < 12) result[month] += counts[i];
			});
			return result;
		};
		stationCounts = monthly(stationCounts);
		series = series.map(s => ({ ...s, counts: monthly(s.counts) }));
		periods = Array.from({ length: 12 }, (_, i) => `${data.start.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`);
	}
	const focusCounts = periods.map((_, i) => series.reduce((sum, s) => sum + s.counts[i], 0));
	if (selected.size && showAll) {
		series.push({ name: 'Other', counts: stationCounts.map((n, i) => Math.max(0, n - focusCounts[i])) });
	}
	return { periods, series, focusCounts, focusTotal: focusCounts.reduce((sum, n) => sum + n, 0) };
}
