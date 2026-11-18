import { isSameChannelEntry } from '@iptvnator/shared/m3u-utils';
import { Channel } from '@iptvnator/shared/interfaces';

/**
 * One row per stream URL. When the active entry is one of several copies of
 * that URL, keep that exact entry so the playing row never disappears; every
 * other copy is dropped.
 */
export function dedupeChannelsByUrl(
    channels: readonly Channel[],
    active: Channel | null | undefined
): Channel[] {
    const activeEntry = active
        ? channels.find((channel) => isSameChannelEntry(channel, active))
        : undefined;
    const activeUrl = activeEntry?.url?.trim() ?? '';
    const seen = new Set<string>();
    const result: Channel[] = [];

    for (const channel of channels) {
        const url = channel.url?.trim() ?? '';
        if (!url) {
            result.push(channel);
            continue;
        }
        if (activeEntry && channel !== activeEntry && url === activeUrl) {
            // Leave the URL's slot for the entry that is actually playing.
            continue;
        }
        if (seen.has(url)) {
            continue;
        }
        seen.add(url);
        result.push(channel);
    }

    return result;
}
