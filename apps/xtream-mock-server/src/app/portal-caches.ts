import type { PortalData } from './data-store.js';
import type { RawVodDetails } from './generators/vod.generator.js';
import type { RawSeriesInfo } from './generators/series.generator.js';
import { clearAccountDetails, portalIdentityKey } from './account-identity.js';
import { resetDroppingEpisodes } from './dropping-episode.js';

export const portalCache = new Map<string, PortalData>();
export const vodDetailsCache = new Map<string, RawVodDetails>();
export const seriesInfoCache = new Map<string, RawSeriesInfo>();

/** Evict only this account, including series details and stream drops. */
export function resetAccount(username: string, password: string): void {
    const key = portalIdentityKey(username, password);
    portalCache.delete(key);
    clearAccountDetails(vodDetailsCache, key);
    clearAccountDetails(seriesInfoCache, key);
    resetDroppingEpisodes(username, password);
}

/** Clear every generated portal, detail cache and stream-drop record. */
export function resetAll(): void {
    portalCache.clear();
    vodDetailsCache.clear();
    seriesInfoCache.clear();
    resetDroppingEpisodes();
}

/** Test-only cache sizes; never exposes credential-bearing keys or fixture data. */
export function getDetailCacheCardinalityForTesting(): Readonly<{
    vodDetails: number;
    seriesInfo: number;
}> {
    return {
        vodDetails: vodDetailsCache.size,
        seriesInfo: seriesInfoCache.size,
    };
}
