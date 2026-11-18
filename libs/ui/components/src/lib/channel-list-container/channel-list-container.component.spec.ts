import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    convertToParamMap,
    ActivatedRoute,
    NavigationEnd,
    Router,
} from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, firstValueFrom, of, Subject } from 'rxjs';
import { EpgService } from '@iptvnator/epg/data-access';
import { PlaylistContextFacade } from '@iptvnator/playlist/shared/util';
import { ChannelActions, PlaylistActions } from '@iptvnator/m3u-state';
import {
    ParentalLockService,
    PlaylistsService,
    RuntimeCapabilitiesService,
    SettingsStore,
} from '@iptvnator/services';
import {
    Channel,
    EpgProgram,
    PlaylistMeta,
} from '@iptvnator/shared/interfaces';
import { ChannelListContainerComponent } from './channel-list-container.component';

function createChannel(id: string, url: string): Channel {
    return {
        id,
        url,
        name: id,
        group: { title: 'Group' },
        tvg: {
            id,
            name: id,
            url: '',
            logo: '',
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

function createTrackedUrlChannel(
    id: string,
    url: string,
    onUrlRead: () => void
): Channel {
    const channel = createChannel(id, url);

    Object.defineProperty(channel, 'url', {
        configurable: true,
        enumerable: true,
        get: () => {
            onUrlRead();
            return url;
        },
    });

    return channel;
}

describe('ChannelListContainerComponent', () => {
    let fixture: ComponentFixture<ChannelListContainerComponent>;
    let dispatch: jest.Mock;
    let activePlaylistSignal: ReturnType<typeof signal<PlaylistMeta | null>>;
    let epgService: {
        epgAvailable$: BehaviorSubject<boolean>;
        getChannelMetadataForChannels: jest.Mock;
        getCurrentProgramsForChannels: jest.Mock;
    };
    let favoriteChannelIds$: BehaviorSubject<string[]>;
    let runtimeCapabilities: { supportsEpg: boolean };
    let globalEpgUrls: WritableSignal<string[]>;
    let storageGet: jest.Mock;
    const hideDuplicateChannels = signal(true);

    beforeEach(async () => {
        hideDuplicateChannels.set(true);
        const routerEvents$ = new Subject<NavigationEnd>();
        dispatch = jest.fn();
        favoriteChannelIds$ = new BehaviorSubject<string[]>([]);
        runtimeCapabilities = { supportsEpg: true };
        globalEpgUrls = signal([]);
        epgService = {
            epgAvailable$: new BehaviorSubject<boolean>(false),
            getChannelMetadataForChannels: jest
                .fn()
                .mockReturnValue(of(new Map())),
            getCurrentProgramsForChannels: jest
                .fn()
                .mockReturnValue(of(new Map())),
        };
        activePlaylistSignal = signal<PlaylistMeta | null>({
            _id: 'playlist-1',
            title: 'Playlist One',
            count: 0,
            importDate: '2026-04-11T00:00:00.000Z',
            hiddenGroupTitles: ['News'],
        } as PlaylistMeta);

        const route = {
            snapshot: {
                paramMap: convertToParamMap({}),
                queryParamMap: convertToParamMap({}),
                params: {},
                queryParams: {},
            },
            pathFromRoot: [
                {
                    snapshot: {
                        paramMap: convertToParamMap({}),
                        params: {},
                    },
                    paramMap: of(convertToParamMap({})),
                },
            ],
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({})),
        } as unknown as ActivatedRoute;

        await TestBed.configureTestingModule({
            imports: [ChannelListContainerComponent],
            providers: [
                { provide: MatSnackBar, useValue: { open: jest.fn() } },
                {
                    provide: TranslateService,
                    useValue: { instant: (key: string) => key },
                },
                {
                    provide: EpgService,
                    useValue: epgService,
                },
                {
                    provide: PlaylistsService,
                    useValue: {},
                },
                {
                    provide: SettingsStore,
                    useValue: {
                        epgUrl: globalEpgUrls,
                        openStreamOnDoubleClick: signal(false),
                        resolvedEpgOffsetMinutes: signal(0),
                        hideDuplicateChannels,
                    },
                },
                {
                    provide: RuntimeCapabilitiesService,
                    useValue: runtimeCapabilities,
                },
                {
                    provide: Store,
                    useValue: {
                        dispatch,
                        select: jest
                            .fn()
                            .mockReturnValue(
                                favoriteChannelIds$.asObservable()
                            ),
                        selectSignal: jest.fn(() => signal(undefined)),
                    },
                },
                {
                    provide: Router,
                    useValue: {
                        url: '/workspace/playlists/demo/all',
                        events: routerEvents$.asObservable(),
                    },
                },
                {
                    provide: ActivatedRoute,
                    useValue: route,
                },
                {
                    provide: PlaylistContextFacade,
                    useValue: {
                        activePlaylist: activePlaylistSignal,
                        resolvedPlaylistId: signal(null),
                    },
                },
            ],
        })
            .overrideComponent(ChannelListContainerComponent, {
                set: {
                    template: '',
                    imports: [],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ChannelListContainerComponent);
    });

    it.each([
        ['live', 'live'],
        ['series', 'series'],
        ['vod', 'movie'],
    ])(
        'filters %s groups by entry type, including saved raw entries',
        (section, type) => {
            const component = fixture.componentInstance;
            const channels = [
                createChannel('live', 'http://example.test/live'),
                {
                    ...createChannel('series', 'http://example.test/episode'),
                    type: 'series',
                },
                {
                    ...createChannel('movie', 'http://example.test/movie'),
                    raw: '#EXTINF:-1 type="movie",Film',
                },
            ];
            component.channelList = channels;
            fixture.componentRef.setInput('activeView', section);
            fixture.detectChanges();
            expect(component.renderView()).toBe('groups');
            expect(
                component.displayedChannels().map((channel) => channel.id)
            ).toEqual([type]);
            expect(component.groupedChannels()['Group']).toHaveLength(1);
            fixture.componentRef.setInput('activeView', 'groups');
            expect(component.displayedChannels()).toHaveLength(3);
        }
    );

    it.each(['movie', 'series'])(
        'browses typed %s entries even when double-click requests playback',
        (type) => {
            const channel = {
                ...createChannel('vod', 'http://example.test/stream'),
                type,
            };
            fixture.componentInstance.onChannelPlaybackRequested(channel);
            expect(TestBed.inject(Store).dispatch).toHaveBeenCalledWith(
                ChannelActions.setActiveChannel({ channel })
            );
        }
    );

    it('keeps the groups view (and its unlock row) when every group is withheld', () => {
        const withheld = signal(0);
        Object.defineProperty(fixture.componentInstance, 'withheldGroupCount', {
            value: withheld,
        });
        fixture.componentRef.setInput('activeView', 'groups');
        fixture.detectChanges();
        const component = fixture.componentInstance;

        // No channels and nothing withheld: the generic empty state.
        expect(component.showChannelViews()).toBe(false);

        withheld.set(3);
        expect(component.showChannelViews()).toBe(true);

        // Other views have no unlock row to show.
        fixture.componentRef.setInput('activeView', 'all');
        expect(component.showChannelViews()).toBe(false);
    });

    it('drops a group lock toggle whose playlist changed while the PIN was asked', async () => {
        const parentalLock = TestBed.inject(ParentalLockService);
        const setM3uLocks = jest
            .spyOn(parentalLock, 'setM3uLocks')
            .mockResolvedValue(true);
        jest.spyOn(parentalLock, 'requestUnlock').mockImplementation(
            async () => {
                activePlaylistSignal.set({
                    _id: 'playlist-2',
                    title: 'Playlist Two',
                    count: 0,
                    importDate: '2026-04-11T00:00:00.000Z',
                } as PlaylistMeta);
                return true;
            }
        );

        await fixture.componentInstance.onGroupLockToggled({
            groupKey: 'News',
            locked: false,
        });

        expect(setM3uLocks).not.toHaveBeenCalled();
    });

    it('saves a group lock toggle under the playlist it was requested for', async () => {
        const parentalLock = TestBed.inject(ParentalLockService);
        const setM3uLocks = jest
            .spyOn(parentalLock, 'setM3uLocks')
            .mockResolvedValue(true);
        jest.spyOn(parentalLock, 'requestUnlock').mockResolvedValue(true);

        await fixture.componentInstance.onGroupLockToggled({
            groupKey: 'News',
            locked: true,
        });

        expect(setM3uLocks).toHaveBeenCalledWith(
            'playlist-1',
            expect.any(Function)
        );
    });

    it('does not clear the shared channel list on destroy', () => {
        fixture.detectChanges();

        fixture.destroy();

        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(
            ChannelActions.resetActiveChannel()
        );
    });

    it('keeps the active channel on destroy when the host opts out (fullscreen panel copy)', () => {
        fixture.componentRef.setInput('resetActiveChannelOnDestroy', false);
        fixture.detectChanges();

        fixture.destroy();

        expect(dispatch).not.toHaveBeenCalledWith(
            ChannelActions.resetActiveChannel()
        );
    });

    it('prefers a host-supplied search term over the route query parameter', () => {
        fixture.componentRef.setInput('searchTerm', '  News ');
        fixture.detectChanges();

        expect(fixture.componentInstance.workspaceSearchTerm()).toBe('news');

        fixture.componentRef.setInput('searchTerm', null);
        fixture.detectChanges();

        expect(fixture.componentInstance.workspaceSearchTerm()).toBe('');
    });

    it('does not enable EPG rows when runtime EPG support is unavailable', () => {
        runtimeCapabilities.supportsEpg = false;
        globalEpgUrls.set(['https://example.test/epg.xml']);

        fixture.detectChanges();

        expect(fixture.componentInstance.shouldShowEpg()).toBe(false);
        expect(fixture.componentInstance.itemSize()).toBe(52);
    });

    it('enables EPG rows when a global guide becomes available in settings', () => {
        fixture.detectChanges();
        expect(fixture.componentInstance.shouldShowEpg()).toBe(false);

        globalEpgUrls.set(['https://example.test/epg.xml']);
        expect(fixture.componentInstance.shouldShowEpg()).toBe(true);
        expect(fixture.componentInstance.itemSize()).toBe(68);
    });

    it('enables EPG rows and scopes lookups when the active M3U playlist has detected EPG URLs', () => {
        runtimeCapabilities.supportsEpg = true;
        activePlaylistSignal.set({
            _id: 'playlist-1',
            title: 'Playlist One',
            count: 1,
            importDate: '2026-04-11T00:00:00.000Z',
            epgUrls: ['https://playlist.example.com/guide.xml'],
        } as PlaylistMeta);

        fixture.detectChanges();
        fixture.componentInstance.channelList = [
            createChannel('guide-news', 'https://example.com/news.m3u8'),
        ];

        expect(fixture.componentInstance.shouldShowEpg()).toBe(true);
        expect(epgService.getCurrentProgramsForChannels).toHaveBeenCalledWith(
            ['guide-news'],
            { sourceUrls: ['https://playlist.example.com/guide.xml'] }
        );
        expect(epgService.getChannelMetadataForChannels).toHaveBeenCalledWith(
            ['guide-news'],
            { sourceUrls: ['https://playlist.example.com/guide.xml'] }
        );
    });

    it('drops a superseded EPG refresh that completes after the newer one', () => {
        runtimeCapabilities.supportsEpg = true;
        globalEpgUrls.set(['https://example.test/epg.xml']);
        const first = new Subject<Map<string, EpgProgram | null>>();
        const program = (title: string): EpgProgram => ({
            start: '2026-04-11T10:00:00.000Z',
            stop: '2026-04-11T11:00:00.000Z',
            channel: 'guide-news',
            title,
            desc: null,
            category: null,
        });
        epgService.getCurrentProgramsForChannels
            .mockReturnValueOnce(first.asObservable())
            .mockReturnValueOnce(
                of(new Map([['guide-news', program('Fresh')]]))
            );

        fixture.detectChanges();
        const channels = [
            createChannel('guide-news', 'https://example.com/news.m3u8'),
        ];
        fixture.componentInstance.channelList = channels;
        // A second fetch (e.g. the display offset changed) supersedes the first.
        fixture.componentInstance.channelList = channels;
        expect(
            fixture.componentInstance.channelEpgMap().get('guide-news')?.title
        ).toBe('Fresh');

        // The stale first fetch lands last and must not overwrite the map.
        first.next(new Map([['guide-news', program('Stale')]]));
        first.complete();

        expect(
            fixture.componentInstance.channelEpgMap().get('guide-news')?.title
        ).toBe('Fresh');
    });

    it('refreshes visible channel EPG when playlist EPG URLs arrive after channels', () => {
        runtimeCapabilities.supportsEpg = true;

        fixture.detectChanges();
        fixture.componentInstance.channelList = [
            createChannel('guide-news', 'https://example.com/news.m3u8'),
        ];
        expect(epgService.getCurrentProgramsForChannels).toHaveBeenCalledWith(
            ['guide-news'],
            undefined
        );
        epgService.getCurrentProgramsForChannels.mockClear();
        epgService.getChannelMetadataForChannels.mockClear();

        activePlaylistSignal.set({
            _id: 'playlist-1',
            title: 'Playlist One',
            count: 1,
            importDate: '2026-04-11T00:00:00.000Z',
            epgUrls: ['https://playlist.example.com/guide.xml'],
        } as PlaylistMeta);
        fixture.detectChanges();

        expect(epgService.getCurrentProgramsForChannels).toHaveBeenCalledWith(
            ['guide-news'],
            { sourceUrls: ['https://playlist.example.com/guide.xml'] }
        );
        expect(epgService.getChannelMetadataForChannels).toHaveBeenCalledWith(
            ['guide-news'],
            { sourceUrls: ['https://playlist.example.com/guide.xml'] }
        );
    });

    it('debounces visible channel EPG row refreshes after EPG imports complete', () => {
        jest.useFakeTimers();
        try {
            runtimeCapabilities.supportsEpg = true;
            activePlaylistSignal.set({
                _id: 'playlist-1',
                title: 'Playlist One',
                count: 1,
                importDate: '2026-04-11T00:00:00.000Z',
                epgUrls: ['https://playlist.example.com/guide.xml'],
            } as PlaylistMeta);

            fixture.detectChanges();
            fixture.componentInstance.channelList = [
                createChannel('guide-news', 'https://example.com/news.m3u8'),
            ];
            epgService.getCurrentProgramsForChannels.mockClear();

            epgService.epgAvailable$.next(true);
            epgService.epgAvailable$.next(true);
            jest.advanceTimersByTime(1999);

            expect(
                epgService.getCurrentProgramsForChannels
            ).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);

            expect(
                epgService.getCurrentProgramsForChannels
            ).toHaveBeenCalledTimes(1);
            expect(
                epgService.getCurrentProgramsForChannels
            ).toHaveBeenCalledWith(['guide-news'], {
                sourceUrls: ['https://playlist.example.com/guide.xml'],
            });
        } finally {
            fixture.destroy();
            jest.useRealTimers();
        }
    });

    it('dispatches playlist meta updates when hidden group titles change', () => {
        fixture.componentInstance.onHiddenGroupTitlesChanged([
            'Movies',
            'Sports',
        ]);

        expect(dispatch).toHaveBeenCalledWith(
            PlaylistActions.updatePlaylistMeta({
                playlist: {
                    _id: 'playlist-1',
                    hiddenGroupTitles: ['Movies', 'Sports'],
                } as PlaylistMeta,
            })
        );
    });

    it('maps favorite URLs with one channel lookup pass while preserving order and first duplicate match', async () => {
        let urlReadCount = 0;
        const firstDuplicate = createTrackedUrlChannel(
            'first-duplicate',
            'duplicate-url',
            () => {
                urlReadCount += 1;
            }
        );
        const sports = createTrackedUrlChannel('sports', 'sports-url', () => {
            urlReadCount += 1;
        });
        const secondDuplicate = createTrackedUrlChannel(
            'second-duplicate',
            'duplicate-url',
            () => {
                urlReadCount += 1;
            }
        );

        fixture.componentInstance.channelList = [
            firstDuplicate,
            sports,
            secondDuplicate,
        ];
        favoriteChannelIds$.next([
            'sports-url',
            'missing-url',
            'duplicate-url',
        ]);
        urlReadCount = 0;

        const favorites = await firstValueFrom(
            fixture.componentInstance.favorites$
        );

        expect(favorites).toHaveLength(2);
        expect(favorites[0]).toBe(sports);
        expect(favorites[1]).toBe(firstDuplicate);
        expect(urlReadCount).toBe(3);
    });

    it('shows one row per stream URL', () => {
        const first = createChannel('first', 'http://example.test/shared');
        const duplicate = createChannel(
            'duplicate',
            'http://example.test/shared'
        );
        const other = createChannel('other', 'http://example.test/other');

        fixture.componentInstance.channelList = [first, duplicate, other];
        fixture.componentRef.setInput('activeView', 'all');
        fixture.detectChanges();

        expect(
            fixture.componentInstance
                .displayedChannels()
                .map((channel) => channel.id)
        ).toEqual(['first', 'other']);
    });

    it('lists every duplicate URL again when the setting is off', () => {
        hideDuplicateChannels.set(false);
        const first = createChannel('first', 'http://example.test/shared');
        const duplicate = createChannel(
            'duplicate',
            'http://example.test/shared'
        );

        fixture.componentInstance.channelList = [first, duplicate];
        fixture.componentRef.setInput('activeView', 'all');
        fixture.detectChanges();

        expect(
            fixture.componentInstance
                .displayedChannels()
                .map((channel) => channel.id)
        ).toEqual(['first', 'duplicate']);
    });

    it('trims leading and trailing spaces from channel names when the list loads', () => {
        const padded = createChannel('news', 'https://example.test/news');
        padded.name = '  BBC News  ';
        padded.tvg.name = '\tBBC News\t';

        fixture.componentInstance.channelList = [padded];

        expect(fixture.componentInstance.channelList[0].name).toBe('BBC News');
        expect(fixture.componentInstance.channelList[0].tvg.name).toBe(
            'BBC News'
        );
    });
});
