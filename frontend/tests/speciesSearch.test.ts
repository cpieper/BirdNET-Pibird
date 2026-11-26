import { expect, test } from 'vitest';
import { findExactSpeciesMatch, getSpeciesSuggestions } from '../src/lib/speciesSearch';
const species = [
    { Com_Name: 'Downy Woodpecker', Sci_Name: 'Dryobates pubescens' },
    { Com_Name: 'Red-bellied Woodpecker', Sci_Name: 'Melanerpes carolinus' },
    { Com_Name: 'House Finch', Sci_Name: 'Haemorhous mexicanus' },
    { Com_Name: 'Fish Crow', Sci_Name: 'Corvus ossifragus' },
];
test('substring suggestions match common and scientific names', () => {
    expect(getSpeciesSuggestions('woodpecker', species).map(item => item.Com_Name))
        .toEqual(['Downy Woodpecker', 'Red-bellied Woodpecker']);
    expect(getSpeciesSuggestions('dryobates', species)[0]?.Com_Name).toBe('Downy Woodpecker');
});
test('exact species matching ignores case but rejects partial names', () => {
    expect(findExactSpeciesMatch('downy woodpecker', species)?.Sci_Name).toBe('Dryobates pubescens');
    expect(findExactSpeciesMatch('Dryobates pubescens', species)?.Com_Name).toBe('Downy Woodpecker');
    expect(findExactSpeciesMatch('woodpecker', species)).toBeUndefined();
});
