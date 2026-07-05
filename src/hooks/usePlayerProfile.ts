import { useCallback, useEffect, useState } from 'react';
import type { PlayerProfile } from '../utils/progression';
import { createProfile } from '../utils/progression';

const STORAGE_KEY = 'pokedexGame.profile.v1';

export const loadProfile = (): PlayerProfile => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return createProfile();
        const parsed = JSON.parse(raw) as PlayerProfile;
        if (parsed?.version !== 1) return createProfile();
        // Backfill any fields added since the profile was first saved
        const defaults = createProfile();
        return {
            ...defaults,
            ...parsed,
            records: { ...defaults.records, ...parsed.records },
            league: { ...defaults.league, ...parsed.league },
        journey: { ...defaults.journey, ...parsed.journey },
        };
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
