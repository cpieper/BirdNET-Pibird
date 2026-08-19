export interface SpeciesSearchOption {
	Com_Name: string;
	Sci_Name: string;
}

function normalizeSpeciesValue(value: string): string {
	return value.trim().toLowerCase();
}

function scoreSpeciesMatch(query: string, species: SpeciesSearchOption): number {
	const commonName = normalizeSpeciesValue(species.Com_Name);
	const scientificName = normalizeSpeciesValue(species.Sci_Name);

	if (commonName === query) return 0;
	if (scientificName === query) return 1;
	if (commonName.startsWith(query)) return 2;
	if (scientificName.startsWith(query)) return 3;
	if (commonName.includes(query)) return 4;
	if (scientificName.includes(query)) return 5;
	return Number.POSITIVE_INFINITY;
}

export function findExactSpeciesMatch<TSpecies extends SpeciesSearchOption>(
	value: string,
	options: TSpecies[]
): TSpecies | undefined {
	const query = normalizeSpeciesValue(value);
	if (!query) return undefined;

	return options.find((species) => {
		return (
			normalizeSpeciesValue(species.Com_Name) === query ||
			normalizeSpeciesValue(species.Sci_Name) === query
		);
	});
}

export function getSpeciesSuggestions<TSpecies extends SpeciesSearchOption>(
	value: string,
	options: TSpecies[],
	limit = 8
): TSpecies[] {
	const query = normalizeSpeciesValue(value);
	if (!query) return [];

	return options
		.map((species, index) => ({ species, index, score: scoreSpeciesMatch(query, species) }))
		.filter((match) => Number.isFinite(match.score))
		.sort((a, b) => a.score - b.score || a.index - b.index)
		.slice(0, limit)
		.map((match) => match.species);
}
