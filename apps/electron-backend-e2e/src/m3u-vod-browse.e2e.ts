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

test('M3U VOD opens information and waits for Play before launching MPV', async ({
    dataDir,
}) => {
    const app = await launchElectronApp(dataDir);
    try {
        const page = app.mainWindow;
        await app.electronApp.evaluate(({ ipcMain }) => {
            const scope = globalThis as typeof globalThis & {
                vodLaunches: string[];
            };
            scope.vodLaunches = [];
            ipcMain.removeHandler('OPEN_MPV_PLAYER');
            ipcMain.handle('OPEN_MPV_PLAYER', (_event, url: string) => {
                scope.vodLaunches.push(url);
                return { success: true };
            });
        });
        const path = join(dataDir, 'vod.m3u');
        writeFileSync(
            path,
            '#EXTM3U\n#EXTINF:-1 type="movie",Example Film\nhttp://example.test/film\n#EXTINF:-1 type="series",Example Show S01E02\nhttp://example.test/episode\n'
        );
        await importM3uPlaylistFromNativeDialog(app, path);
        await waitForM3uCatalog(page);
        await page.getByRole('link', { name: 'Open settings' }).click();
        await page
            .locator('[data-test-id="settings-section-playback"]')
            .click();
        await page.locator('[data-test-id="select-video-player"]').click();
        await page
            .getByRole('option', { name: 'MPV player', exact: true })
            .click();
        await page.getByRole('button', { name: 'Save changes' }).click();
        await page.getByRole('button', { name: 'Back', exact: true }).click();
        await waitForM3uCatalog(page);
        const launches = () =>
            app.electronApp.evaluate(
                () =>
                    (
                        globalThis as typeof globalThis & {
                            vodLaunches: string[];
                        }
                    ).vodLaunches
            );
        const play = page.locator('[data-testid="m3u-vod-play"]');
        await page
            .locator('[data-test-id="channel-item"]')
            .filter({ hasText: 'Example Film' })
            .click();
        await expect(play).toBeVisible();
        expect(await launches()).toHaveLength(0);
        await play.click();
        await expect.poll(launches).toHaveLength(1);
        await page
            .locator('[data-test-id="channel-item"]')
            .filter({ hasText: 'Example Show' })
            .click();
        await expect(play).toBeVisible();
        expect(await launches()).toHaveLength(1);
        await expect(page.locator('app-portal-inline-player')).toHaveCount(0);
        await page.screenshot({
            path: test.info().outputPath('m3u-series-information.png'),
        });
        await play.click();
        await expect.poll(launches).toHaveLength(2);
    } finally {
        await closeElectronApp(app);
    }
});
