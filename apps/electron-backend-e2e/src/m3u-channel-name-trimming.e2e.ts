import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    closeElectronApp,
    expect,
    importM3uPlaylistFromNativeDialog,
    launchElectronApp,
    test,
    waitForM3uCatalog,
} from './electron-test-fixtures';

test('M3U import saves trimmed channel names and preserves metadata', async ({
    dataDir,
}) => {
    const app = await launchElectronApp(dataDir);
    try {
        const path = join(dataDir, 'trimmed-names.m3u');
        writeFileSync(
            path,
            '#EXTM3U\n#EXTINF:-1 tvg-id="epg-id" tvg-name="  BBC  News  " group-title="News",  BBC  News  \nhttps://example.test/live\n'
        );
        await importM3uPlaylistFromNativeDialog(app, path);
        await waitForM3uCatalog(app.mainWindow);
        await expect
            .poll(async () =>
                app.mainWindow.evaluate(async () => {
                    const playlists = await window.electron.dbGetAppPlaylists();
                    const playlist = playlists.find(
                        (item) => item.filename === 'trimmed-names'
                    );
                    const channel = playlist?.playlist?.items?.[0];
                    return channel
                        ? {
                              name: channel.name,
                              tvgName: channel.tvg.name,
                              tvgId: channel.tvg.id,
                              url: channel.url,
                          }
                        : null;
                })
            )
            .toEqual({
                name: 'BBC  News',
                tvgName: 'BBC  News',
                tvgId: 'epg-id',
                url: 'https://example.test/live',
            });
    } finally {
        await closeElectronApp(app);
    }
});
