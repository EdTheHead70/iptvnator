import { resolveChannelEpgLookupKey } from '@iptvnator/m3u-state';
import { Channel } from '@iptvnator/shared/interfaces';

/** The playlist's own `tvg-logo`, trimmed. */
export function resolvePlaylistLogo(
    channel: Channel | null | undefined
): string {
    return channel?.tvg?.logo?.trim() ?? '';
}

/**
 * Playlist logo first by default; `preferEpgIcon` swaps the priority so a
 * channel icon from the EPG feed wins whenever the guide publishes one.
 */
export function resolveChannelLogo(
    channel: Channel | null | undefined,
    channelIconMap: ReadonlyMap<string, string | null | undefined>,
    preferEpgIcon = false
): string {
    const playlistLogo = resolvePlaylistLogo(channel);
    const channelId = resolveChannelEpgLookupKey(channel);
    const epgIcon = channelId
        ? (channelIconMap.get(channelId)?.trim() ?? '')
        : '';

    return preferEpgIcon ? epgIcon || playlistLogo : playlistLogo || epgIcon;
}
