import { parse } from 'iptv-playlist-parser';
import { getM3uContentType, readM3uTypeFromRaw } from './m3u-content-type.util';
import { createPlaylistObject } from './playlist.utils';
import { ParsedPlaylist } from '@iptvnator/shared/interfaces';

describe('M3U content types', () => {
    it.each([
        ['type="series"', 'series'],
        ["type='movie'", 'movie'],
        ['type=series', 'series'],
        ['TYPE="MOVIE"', 'movie'],
        ['', 'live'],
        ['type="unknown"', 'live'],
        ['catchup-type="movie"', 'live'],
        ['tvg-type="series"', 'live'],
        ['group-title="type=movie"', 'live'],
        ['group-title="A, B" type="movie"', 'movie'],
    ])(
        'classifies %s for old and newly imported entries',
        (attrs, expected) => {
            const raw = `#EXTINF:-1 ${attrs},Example`;
            expect(getM3uContentType({ raw })).toBe(expected);
            const parsed = parse(`#EXTM3U\n${raw}\nhttp://example.test/stream`);
            const playlist = createPlaylistObject(
                'Test',
                parsed as unknown as ParsedPlaylist
            );
            expect(getM3uContentType(playlist.playlist.items[0])).toBe(
                expected
            );
            expect(playlist.playlist.items[0].type).toBe(
                readM3uTypeFromRaw(raw)
            );
        }
    );

    it('ignores type text in a display name or later directive', () => {
        expect(
            getM3uContentType({
                raw: '#EXTINF:-1,Example type="movie"\n#OTHER:type="series"',
            })
        ).toBe('live');
    });

    it('uses an explicit normalized type ahead of raw', () => {
        expect(
            getM3uContentType({
                type: 'series',
                raw: '#EXTINF:-1 type="movie",Example',
            })
        ).toBe('series');
    });
});
