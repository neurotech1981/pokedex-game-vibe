import { useCallback, useEffect, useState } from 'react';
import type { PlayerProfile } from '../utils/progression';
import { createProfile } from '../utils/progression';
import type { Rng } from '../utils/battleEngine';
import { rollIvs, rollNature } from '../data/natures';

const STORAGE_KEY = 'pokedexGame.profile.v1';

/**
 * Pure backfill for profiles saved before newer fields existed. Nature/IV
 * rolls happen at most once per mon: entries that already carry them are
 * never rerolled (the mount-persist effect writes the merged profile back,
 * so the roll sticks).
 */
export const mergeProfile = (parsed: PlayerProfile, rng: Rng = Math.random): PlayerProfile => {
    const defaults = createProfile();
    const mons: PlayerProfile['mons'] = {};
    for (const [id, mon] of Object.entries(parsed.mons ?? {})) {
        mons[Number(id)] = {
            ...mon,
            nature: mon.nature ?? rollNature(rng),
            ivs: mon.ivs ?? rollIvs(rng),
        };
    }
    // Pre-dex saves: best-effort derivation — everything you own counts as caught (and seen).
    const dex = parsed.dex
        ? { ...defaults.dex, ...parsed.dex }
        : (() => {
            const owned = [...new Set([
                ...Object.keys(parsed.mons ?? {}).map(Number),
                ...(parsed.box ?? []).map(b => b.pokemon.id),
            ])];
            return { seen: owned, caught: owned };
        })();
    return {
        ...defaults,
        ...parsed,
        mons,
        records: { ...defaults.records, ...parsed.records },
        league: { ...defaults.league, ...parsed.league },
        journey: { ...defaults.journey, ...parsed.journey },
        dex,
    };
};

export const loadProfile = (): PlayerProfile => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return createProfile();
        const parsed = JSON.parse(raw) as PlayerProfile;
        if (parsed?.version !== 1) return createProfile();
        return mergeProfile(parsed);
    } catch {
        return createProfile();
    }
};

/** Persistent player profile (XP, items, records, box) backed by localStorage. */
export const usePlayerProfile = () => {
    const [profile, setProfile] = useState<PlayerProfile>(loadProfile);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch {
            // Storage full/unavailable — the in-memory profile still works for this session.
        }
    }, [profile]);

    const updateProfile = useCallback((updater: (prev: PlayerProfile) => PlayerProfile) => {
        setProfile(prev => updater(prev));
    }, []);

    return { profile, updateProfile } as const;
};
