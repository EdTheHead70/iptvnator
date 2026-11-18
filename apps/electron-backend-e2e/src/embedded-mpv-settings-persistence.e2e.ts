import {
    closeElectronApp,
    expect,
    launchElectronApp,
    openSettings,
    openSettingsSection,
    saveSettings,
    test,
} from './electron-test-fixtures';

test('Embedded MPV selection survives a development app restart', async ({
    dataDir,
}) => {
    const options = { env: { IPTVNATOR_ENABLE_EMBEDDED_MPV_EXPERIMENT: '1' } };
    let app = await launchElectronApp(dataDir, options);
    try {
        await openSettings(app.mainWindow);
        await openSettingsSection(app.mainWindow, 'playback');
        await app.mainWindow.getByTestId('select-video-player').click();
        await app.mainWindow.getByTestId('embedded-mpv').click();
        await saveSettings(app.mainWindow);
        await closeElectronApp(app);
        app = await launchElectronApp(dataDir, {
            env: { IPTVNATOR_ENABLE_EMBEDDED_MPV_EXPERIMENT: '0' },
        });
        await openSettings(app.mainWindow);
        await openSettingsSection(app.mainWindow, 'playback');
        await expect(
            app.mainWindow.getByTestId('select-video-player')
        ).toContainText('Embedded MPV');
        await app.mainWindow.getByTestId('select-video-player').click();
        await expect(
            app.mainWindow.getByTestId('embedded-mpv')
        ).toHaveAttribute('aria-disabled', 'true');
        await app.mainWindow.keyboard.press('Escape');
        await closeElectronApp(app);
        app = await launchElectronApp(dataDir, options);
        const support = await app.mainWindow.evaluate(() =>
            window.electron.getEmbeddedMpvSupport()
        );
        expect(support.supported, support.reason).toBe(true);
        await openSettings(app.mainWindow);
        await openSettingsSection(app.mainWindow, 'playback');
        await expect(
            app.mainWindow.getByTestId('select-video-player')
        ).toContainText('Embedded MPV');
    } finally {
        await closeElectronApp(app);
    }
});
