import { trimM3uChannelNames } from './m3u-channel-names.util';
import { parse } from 'iptv-playlist-parser';
import { ParsedPlaylist } from '@iptvnator/shared/interfaces';
import { createPlaylistObject } from './playlist.utils';

describe('M3U imported channel names', () => {
    it.each(['  ', '\t', '\u00a0'])(
        'trims outer %j while preserving inner spaces and metadata',
        (padding) => {
            const parsed = parse(
                `#EXTM3U\n#EXTINF:-1 tvg-id="  epg-id  " tvg-name="${padding}BBC  News${padding}" group-title=" News ",${padding}BBC  News${padding}\nhttps://example.test/live`
            ) as unknown as ParsedPlaylist;
            const original = structuredClone(parsed);
            const channel = createPlaylistObject('Playlist', parsed).playlist
                .items[0];
            expect(channel.name).toBe('BBC  News');
            expect(channel.tvg.name).toBe('BBC  News');
            expect(channel.tvg.id).toBe(original.items[0].tvg.id);
            expect(channel.group).toEqual(original.items[0].group);
            expect(channel.url).toBe('https://example.test/live');
            expect(channel.raw).toBe(original.items[0].raw);
            expect(parsed).toEqual(original);
        }
    );
});

describe('sparse channel name fields', () => {
    it('preserves missing fields and non-string metadata', () => {
        expect(
            trimM3uChannelNames({ url: 'test', tvg: { id: 'epg' } })
        ).toEqual({ url: 'test', tvg: { id: 'epg' } });
        expect(trimM3uChannelNames({ name: null, tvg: null })).toEqual({
            name: null,
            tvg: null,
        });
        expect(
            trimM3uChannelNames({ name: '   ', tvg: { name: '\t' } })
        ).toEqual({ name: '', tvg: { name: '' } });
    });
});
