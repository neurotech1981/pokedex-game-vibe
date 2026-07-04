import type { Pokemon } from '../types/pokemon';

/**
 * Level-up evolution: walk the PokeAPI evolution chain for a species and
 * find what it evolves into and at what level. The chain-walk itself is
 * pure (testable against fixtures); only the fetch layer touches the
 * network, with a per-species cache.
 *
 * Simplifications (documented): branching chains (e.g. Eevee) take the
 * first branch; level-less evolutions (trade/stone/happiness) default to
 * level 30 for stage 1→2 and 55 for stage 2→3.
 */

export interface EvolutionTarget {
    id: number;
    name: string;
    minLevel: number;
}

export interface ChainNode {
    species: { name: string; url: string };
    evolves_to: ChainNode[];
    evolution_details?: Array<{ min_level?: number | null }>;
}

const DEFAULT_THRESHOLDS = [30, 55];

export const idFromSpeciesUrl = (url: string): number => {
    const parts = url.split('/').filter(Boolean);
    return parseInt(parts[parts.length - 1], 10);
};

/** Pure chain-walk: find what `pokemonId` evolves into next. */
export const findEvolutionTarget = (root: ChainNode, pokemonId: number): EvolutionTarget | null => {
    const walk = (node: ChainNode, depth: number): EvolutionTarget | null => {
        if (idFromSpeciesUrl(node.species.url) === pokemonId) {
            if (node.evolves_to.length === 0) return null;
            const next = node.evolves_to[0]; // first branch on splits
            const minLevel = next.evolution_details?.find(d => d.min_level != null)?.min_level
                ?? DEFAULT_THRESHOLDS[Math.min(depth, DEFAULT_THRESHOLDS.length - 1)];
            return {
                id: idFromSpeciesUrl(next.species.url),
                name: next.species.name,
                minLevel,
            };
        }
        for (const child of node.evolves_to) {
            const found = walk(child, depth + 1);
            if (found) return found;
        }
        return null;
    };
    return walk(root, 0);
};

const targetCache = new Map<number, Promise<EvolutionTarget | null>>();

const fetchEvolutionTarget = async (pokemonId: number): Promise<EvolutionTarget | null> => {
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    if (!speciesRes.ok) return null;
    const species = await speciesRes.json();
    const chainUrl: string | undefined = species.evolution_chain?.url;
    if (!chainUrl) return null;
    const chainRes = await fetch(chainUrl);
    if (!chainRes.ok) return null;
    const chain = await chainRes.json();
    return findEvolutionTarget(chain.chain as ChainNode, pokemonId);
};

/** What does this species evolve into (cached)? Null when fully evolved. */
export const getEvolutionTarget = (pokemonId: number): Promise<EvolutionTarget | null> => {
    let cached = targetCache.get(pokemonId);
    if (!cached) {
        cached = fetchEvolutionTarget(pokemonId).catch(() => {
            targetCache.delete(pokemonId); // allow retry after a network hiccup
            return null;
        });
        targetCache.set(pokemonId, cached);
    }
    return cached;
};

/** Fetch full battle-ready details for an evolved form (same shape as Pokemon.tsx fetchers). */
export const fetchPokemonById = async (id: number): Promise<Pokemon> => {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!response.ok) throw new Error(`pokemon ${id}: HTTP ${response.status}`);
    const data = await response.json();
    let is_legendary = false;
    let is_mythical = false;
    try {
        const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
        if (speciesRes.ok) {
            const species = await speciesRes.json();
            is_legendary = species.is_legendary;
            is_mythical = species.is_mythical;
        }
    } catch {
        // flags stay false — cosmetic only
    }
    return {
        id: data.id,
        name: data.name,
        image: data.sprites.front_default,
        types: data.types.map((t: { type: { name: string } }) => t.type.name),
        height: data.height / 10,
        weight: data.weight / 10,
        stats: data.stats,
        abilities: data.abilities,
        is_legendary,
        is_mythical,
    };
};
