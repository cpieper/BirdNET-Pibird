// @ts-nocheck
import assert from 'node:assert/strict';
import {
	findExactSpeciesMatch,
	getSpeciesSuggestions,
	type SpeciesSearchOption,
} from '../src/lib/speciesSearch.ts';

const species: SpeciesSearchOption[] = [
	{ Com_Name: 'Downy Woodpecker', Sci_Name: 'Dryobates pubescens' },
	{ Com_Name: 'Red-bellied Woodpecker', Sci_Name: 'Melanerpes carolinus' },
	{ Com_Name: 'House Finch', Sci_Name: 'Haemorhous mexicanus' },
	{ Com_Name: 'Fish Crow', Sci_Name: 'Corvus ossifragus' },
];

assert.deepEqual(
	getSpeciesSuggestions('woodpecker', species).map((item) => item.Com_Name),
	['Downy Woodpecker', 'Red-bellied Woodpecker']
);

assert.equal(getSpeciesSuggestions('dryobates', species)[0]?.Com_Name, 'Downy Woodpecker');
assert.equal(findExactSpeciesMatch('downy woodpecker', species)?.Sci_Name, 'Dryobates pubescens');
assert.equal(findExactSpeciesMatch('Dryobates pubescens', species)?.Com_Name, 'Downy Woodpecker');
assert.equal(findExactSpeciesMatch('woodpecker', species), undefined);
