import { Channel } from '@iptvnator/shared/interfaces';
import { dedupeChannelsByUrl } from './dedupe-channels-by-url.util';

function channel(id: string, url: string, name = id): Channel {
    return {
        epgParams: '',
        group: { title: 'News' },
        http: { origin: '', referrer: '', 'user-agent': '' },
        id,
        name,
        radio: 'false',
        tvg: { id: `${id}-tvg`, logo: '', name, rec: '', url: '' },
        url,
    } as Channel;
}

describe('dedupeChannelsByUrl', () => {
    it('keeps the first entry for each stream URL', () => {
        const first = channel('first', 'https://example.test/shared');
        const duplicate = channel('duplicate', 'https://example.test/shared');
        const other = channel('other', 'https://example.test/other');

        expect(
            dedupeChannelsByUrl([first, duplicate, other], null).map(
                (item) => item.id
            )
        ).toEqual(['first', 'other']);
    });

    it('keeps the active entry when it is a later duplicate', () => {
        const first = channel('first', 'https://example.test/shared');
        const active = channel('active', 'https://example.test/shared');
        const other = channel('other', 'https://example.test/other');

        expect(
            dedupeChannelsByUrl([first, active, other], {
                ...active,
                epgParams: 'rewritten',
            }).map((item) => item.id)
        ).toEqual(['active', 'other']);
    });

    it('does not collapse entries without a stream URL', () => {
        const one = channel('one', '');
        const two = channel('two', '');

        expect(
            dedupeChannelsByUrl([one, two], null).map((item) => item.id)
        ).toEqual(['one', 'two']);
    });
});
