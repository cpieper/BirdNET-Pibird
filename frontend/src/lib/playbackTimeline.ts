export interface TimeSelection { start: number; end: number }

/** Use measured duration ratios: cached tempo renders can include encoder padding. */
export function mapPlaybackTime(time: number, fromDuration: number, toDuration: number): number {
	if (![time, fromDuration, toDuration].every(Number.isFinite) || fromDuration <= 0 || toDuration <= 0) return 0;
	return Math.max(0, Math.min(toDuration, time / fromDuration * toDuration));
}

export function pointerTime(x: number, left: number, width: number, duration: number): number {
	return mapPlaybackTime(x - left, width, duration);
}

export function normalizeSelection(a: number, b: number, duration: number): TimeSelection | null {
	const start = Math.max(0, Math.min(duration, Math.min(a, b)));
	const end = Math.max(0, Math.min(duration, Math.max(a, b)));
	return Number.isFinite(start) && Number.isFinite(end) && end - start >= 0.05 ? { start, end } : null;
}
