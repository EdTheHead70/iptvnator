import { resolveChannelLogo } from './channel-logo-fallback.util';
import type { Channel } from '@iptvnator/shared/interfaces';

function channel(logo: string): Channel {
    return {
        id: 'news',
        url: 'https://example.test/news',
        name: 'News',
        group: { title: 'Group' },
        tvg: {
            id: 'news',
            name: 'News',
            url: '',
            logo,
            rec: '',
        },
        http: {
            referrer: '',
            'user-agent': '',
            origin: '',
        },
        radio: 'false',
    };
}

describe('resolveChannelLogo', () => {
    const icons = new Map([['news', 'https://example.test/epg.png']]);

    it('keeps the playlist logo first by default and falls back to the EPG icon', () => {
        expect(resolveChannelLogo(channel('playlist.png'), icons)).toBe(
            'playlist.png'
        );
        expect(resolveChannelLogo(channel('   '), icons)).toBe(
            'https://example.test/epg.png'
        );
    });

    it('prefers the EPG icon when requested and falls back to the playlist logo', () => {
        expect(resolveChannelLogo(channel('playlist.png'), icons, true)).toBe(
            'https://example.test/epg.png'
        );
        expect(
            resolveChannelLogo(channel('playlist.png'), new Map(), true)
        ).toBe('playlist.png');
    });

    it('returns an empty string when neither source has an icon', () => {
        expect(resolveChannelLogo(channel(''), new Map(), true)).toBe('');
        expect(resolveChannelLogo(null, icons)).toBe('');
    });
});
