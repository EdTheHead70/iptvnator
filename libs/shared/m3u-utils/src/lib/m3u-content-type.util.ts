import type { Channel } from '@iptvnator/shared/interfaces';

export type M3uContentType = 'live' | 'series' | 'movie';

/** Read only the standalone EXTINF attribute, not catchup-type or the title. */
export function readM3uTypeFromRaw(raw?: string): string | undefined {
    const header = raw?.match(/^#EXTINF:[^\r\n]*/im)?.[0];
    if (!header) return undefined;
    const attributes =
        /(?:^|\s)([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/g;
    let end = 0;
    let match: RegExpExecArray | null;
    while ((match = attributes.exec(header)) !== null) {
        // Commas inside quoted attribute values are consumed by the match.
        if (header.slice(end, match.index).includes(',')) return undefined;
        end = match.index + match[0].length;
        if (match[1].toLowerCase() === 'type') {
            return (match[2] ?? match[3] ?? match[4]).trim().toLowerCase();
        }
    }
    return undefined;
}

/** Older saved entries retain EXTINF in raw, even before type was normalized. */
export function getM3uContentType(
    channel: Pick<Channel, 'type' | 'raw'>
): M3uContentType {
    const type = (channel.type ?? readM3uTypeFromRaw(channel.raw))
        ?.trim()
        .toLowerCase();
    return type === 'series' || type === 'movie' ? type : 'live';
}

export function m3uContentTypeForSection(
    section: string
): M3uContentType | null {
    return section === 'live' || section === 'series'
        ? section
        : section === 'vod'
          ? 'movie'
          : null;
}
