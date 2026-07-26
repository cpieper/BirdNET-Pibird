import type { Detection, RangeChartData } from '$lib/api';

export interface ActivitySegment {
	hour: number;
	count: number;
	intensity: number;
	isPeak: boolean;
	isPending: boolean;
	label: string;
	title: string;
}

export interface DiscoveryPreview {
	total: number;
	visible: Detection[];
	hiddenCount: number;
	reviewHref: string;
}

function hourLabel(hour: number): string {
	if (hour === 0) return '12a';
	if (hour === 6) return '6a';
	if (hour === 12) return '12p';
	if (hour === 18) return '6p';
	return '';
}

export function buildActivitySegments(hourlyData: RangeChartData | null, now = new Date()): ActivitySegment[] {
	const counts = new Array(24).fill(0) as number[];
	const currentHour = now.getHours();

	for (const bucket of hourlyData?.buckets ?? []) {
		const hour = typeof bucket.period === 'number' ? bucket.period : Number(bucket.period);
		if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
			counts[hour] = bucket.count;
		}
	}

	const observedCounts = counts.slice(0, currentHour + 1);
	const max = Math.max(...observedCounts, 0);
	const peakHour = max > 0 ? counts.indexOf(max) : -1;

	return counts.map((count, hour) => {
		const isPending = hour > currentHour;
		return {
			hour,
			count,
			intensity: !isPending && max > 0 ? count / max : 0,
			isPeak: !isPending && hour === peakHour,
			isPending,
			label: hourLabel(hour),
			title: isPending
				? `${hour}:00 - pending`
				: `${hour}:00 - ${count} ${count === 1 ? 'detection' : 'detections'}`,
		};
	});
}

export function detectionTimestamp(detection: Detection): number {
	return new Date(`${detection.Date}T${detection.Time}`).getTime();
}

export function latestDetection(items: Detection[]): Detection | null {
	if (items.length === 0) return null;
	return [...items].sort((a, b) => detectionTimestamp(b) - detectionTimestamp(a))[0];
}

export function isFirstStationRecord(sciName: string, firstStationRecordSet: Set<string>): boolean {
	return firstStationRecordSet.has(sciName);
}

export function buildDiscoveryPreview(detections: Detection[], maxVisible = 3): DiscoveryPreview {
	const visible = detections.slice(0, maxVisible);
	const hiddenCount = Math.max(0, detections.length - visible.length);
	const params = new URLSearchParams({
		date: todayStr(),
		new_on_date: 'true',
	});

	return {
		total: detections.length,
		visible,
		hiddenCount,
		reviewHref: `/detections?${params.toString()}`,
	};
}

export function formatDetectionClock(time: string): string {
	return time.slice(0, 5);
}

export function formatRecencyLabel(detection: Detection | null, now = new Date()): string {
	if (!detection) return '';
	const timestamp = detectionTimestamp(detection);
	if (!Number.isFinite(timestamp)) return `${detection.Date} ${formatDetectionClock(detection.Time)}`;

	const diffMs = now.getTime() - timestamp;
	if (diffMs < 0) return formatDetectionClock(detection.Time);

	const diffMinutes = Math.floor(diffMs / 60000);
	if (diffMinutes < 1) return 'just now';
	if (diffMinutes < 60) return `${diffMinutes} min ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} hr ago`;

	return `${detection.Date} ${formatDetectionClock(detection.Time)}`;
}

function todayStr(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
