import { resolveSearchScopeLabel } from './workspace-shell-search-labels';

describe('M3U search scope labels', () => {
    it.each([
        ['live', 'WORKSPACE.SHELL.RAIL_LIVE'],
        ['series', 'WORKSPACE.SHELL.RAIL_SERIES'],
        ['vod', 'WORKSPACE.SHELL.RAIL_MOVIES'],
    ] as const)(
        'labels %s once without a duplicate category breadcrumb',
        (section, label) => {
            expect(
                resolveSearchScopeLabel({
                    kind: 'portal',
                    context: { provider: 'playlists', playlistId: 'source' },
                    section,
                    translate: (key) => key,
                    xtreamCategory: null,
                    stalkerCategoryName: '',
                })
            ).toBe(label);
        }
    );
});
