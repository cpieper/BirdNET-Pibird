/**
 * Preserve an explicit all-date scope while keeping Review's default as today.
 * @param {URLSearchParams} query
 * @param {string} today
 */
export function reviewDateFromQuery(query, today) {
    const date = query.get('date');
    return date === 'all' ? '' : date || today;
}

/**
 * @param {string} species
 * @param {string} date Empty means all dates.
 */
export function speciesReviewHref(species, date) {
    const query = new URLSearchParams({ date: date || 'all', species });
    return `/detections?${query.toString()}`;
}
