import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
    channelItemByTitle,
    closeElectronApp,
    expect,
    goToDashboard,
    importM3uPlaylistFromNativeDialog,
    launchElectronApp,
    openSettings,
    openSettingsSection,
    saveSettings,
    test,
    workspaceRoot,
    type LaunchedElectronApp,
} from './electron-test-fixtures';
import { createLocalMediaServer } from './embedded-mpv-frame-copy-packaged-fixtures';

test('@playback @electron native MPV button labels stay inside the dock', async ({
    dataDir,
}, testInfo) => {
    const media = await createLocalMediaServer({
        body: readFileSync(
            join(
                workspaceRoot,
                'apps/web-e2e/src/fixtures/playback/episode-chapters.webm'
            )
        ),
        resourcePath: '/episode-chapters.webm',
        contentType: 'video/webm',
    });
    let app: LaunchedElectronApp | undefined;
    try {
        app = await launchElectronApp(dataDir, {
            env: {
                IPTVNATOR_ENABLE_EMBEDDED_MPV_EXPERIMENT: '1',
                IPTVNATOR_ENABLE_EMBEDDED_MPV_FRAME_COPY: '0',
                IPTVNATOR_EMBEDDED_MPV_ALLOW_HOMEBREW: '1',
            },
        });
        const page = app.mainWindow;
        const support = await page.evaluate(() =>
            window.electron.getEmbeddedMpvSupport()
        );
        expect(support.supported).toBe(true);
        expect(support.engine).not.toBe('frame-copy');
        await openSettings(page);
        await openSettingsSection(page, 'playback');
        await page.getByTestId('select-video-player').click();
        await page.getByTestId('embedded-mpv').click();
        await saveSettings(page);
        await goToDashboard(page);
        const playlist = join(dataDir, 'dock-labels.m3u');
        writeFileSync(
            playlist,
            `#EXTM3U\n#EXTINF:-1,Dock labels\n${media.url}\n`
        );
        await importM3uPlaylistFromNativeDialog(app, playlist);
        await channelItemByTitle(page, 'Dock labels').first().click();
        await page
            .getByRole('button', { name: 'Play', exact: true })
            .first()
            .click();
        const dock = page.locator('.embedded-mpv-player__controls');
        const label = page.getByTestId('embedded-mpv-dock-label');
        const button = dock.locator('button[aria-label]').first();
        await expect(button).toBeEnabled({ timeout: 30000 });
        // Pause the fixture to keep controls visible during screenshots.
        await button.focus();
        await button.press('Space');
        await expect(button).toHaveAttribute('aria-label', 'Play');
        await button.hover();
        await expect(label).toHaveText(
            (await button.getAttribute('aria-label')) ?? ''
        );
        for (const dark of [false, true]) {
            await page.evaluate(
                (value) => document.body.classList.toggle('dark-theme', value),
                dark
            );
            await page.mouse.move(0, 0);
            await button.focus();
            await expect(label).toHaveText('Play');
            await expect(label).toBeVisible();
            const dockBox = await dock.boundingBox();
            const labelBox = await label.boundingBox();
            if (!dockBox || !labelBox)
                throw new Error('Dock labels must be visible');
            const viewportBox = await page
                .locator('.embedded-mpv-player__viewport')
                .boundingBox();
            if (!viewportBox) throw new Error('Missing native viewport');
            expect(labelBox.y).toBeGreaterThanOrEqual(
                viewportBox.y + viewportBox.height
            );
            expect(labelBox.y).toBeGreaterThanOrEqual(dockBox.y);
            expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(
                dockBox.y + dockBox.height
            );
            await dock.screenshot({
                path: testInfo.outputPath(
                    `dock-labels-${dark ? 'dark' : 'light'}.png`
                ),
            });
        }
        const aspect = dock.locator('[data-embedded-mpv-menu-button="aspect"]');
        await aspect.hover();
        await expect(label).toHaveText('Aspect ratio Default');
        await page.mouse.move(0, 0);
        await aspect.focus();
        await expect(label).toHaveText('Aspect ratio Default');
        await dock.screenshot({
            path: testInfo.outputPath('dock-aspect-label.png'),
        });
        await page.mouse.move(0, 0);
        await button.focus();
        await expect(label).toHaveText(
            (await button.getAttribute('aria-label')) ?? ''
        );
    } finally {
        try {
            if (app) await closeElectronApp(app);
        } finally {
            await media.close();
        }
    }
});
