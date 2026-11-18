import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    closeElectronApp,
    expect,
    importM3uPlaylistFromNativeDialog,
    launchElectronApp,
    openSources,
    openWorkspaceSection,
    restartElectronApp,
    sourceRowByTitle,
    test,
    waitForM3uCatalog,
} from './electron-test-fixtures';

test('stream testing settings survive restart and control group probe requests', async ({
    dataDir,
}) => {
    const app = await launchElectronApp(dataDir);
    try {
        let page = app.mainWindow;
        const path = join(dataDir, 'testing-settings.m3u');
        writeFileSync(
            path,
            '#EXTM3U\n#EXTINF:-1 group-title="Tests",One\nhttps://example.test/one\n#EXTINF:-1 group-title="Tests",Two\nhttps://example.test/two\n'
        );
        await importM3uPlaylistFromNativeDialog(app, path);
        await waitForM3uCatalog(page);
        await page.getByRole('link', { name: 'Open settings' }).click();
        await page
            .locator('[data-test-id="settings-section-playback"]')
            .click();
        const panel = page.locator('[data-test-id="stream-testing-settings"]');
        await panel.scrollIntoViewIfNeeded();
        await panel.locator('[data-test-id="probe-concurrency"]').fill('0');
        await panel.locator('[data-test-id="probe-concurrency"]').blur();
        await expect(
            page.getByRole('button', { name: 'Save changes' })
        ).toBeDisabled();
        await panel.locator('[data-test-id="probe-concurrency"]').fill('1');
        await panel.locator('[data-test-id="probe-timeoutSeconds"]').fill('4');
        await panel.locator('[data-test-id="probe-cacheSeconds"]').fill('0');
        await panel.locator('[data-test-id="probe-method"]').click();
        await page.getByRole('option', { name: 'GET', exact: true }).click();
        await panel.locator('[data-test-id="probe-rangeBytes"]').click();
        await page.getByRole('option', { name: '16 KiB', exact: true }).click();
        await panel.getByRole('switch').click();
        await expect(panel.getByRole('switch')).not.toBeChecked();
        await page.getByRole('button', { name: 'Save changes' }).click();
        await expect(
            page.getByRole('button', { name: 'Save changes' })
        ).toBeHidden();
        await expect(
            page.getByText('Success! Configuration was saved.', { exact: true })
        ).toBeHidden();
        await panel.screenshot({
            path: test.info().outputPath('stream-testing-settings.png'),
            animations: 'disabled',
        });
        await page.evaluate(() => document.body.classList.add('dark-theme'));
        await panel.screenshot({
            path: test.info().outputPath('stream-testing-settings-dark.png'),
            animations: 'disabled',
        });
        const restarted = await restartElectronApp(app, dataDir);
        app.electronApp = restarted.electronApp;
        app.mainWindow = restarted.mainWindow;
        page = app.mainWindow;
        await page.getByRole('link', { name: 'Open settings' }).click();
        await page
            .locator('[data-test-id="settings-section-playback"]')
            .click();
        await expect(
            page.locator('[data-test-id="probe-concurrency"]')
        ).toHaveValue('1');
        await expect(
            page.locator('[data-test-id="probe-timeoutSeconds"]')
        ).toHaveValue('4');
        await expect(
            page.locator('[data-test-id="probe-cacheSeconds"]')
        ).toHaveValue('0');
        await expect(
            page.locator('[data-test-id="probe-method"]')
        ).toContainText('GET');
        await expect(
            page.locator('[data-test-id="probe-rangeBytes"]')
        ).toContainText('16 KiB');
        await expect(
            page
                .locator('[data-test-id="stream-testing-settings"]')
                .getByRole('switch')
        ).not.toBeChecked();
        await app.electronApp.evaluate(({ ipcMain }) => {
            const scope = globalThis as typeof globalThis & {
                testCalls: unknown[];
                releaseProbe: (() => void) | null;
            };
            scope.testCalls = [];
            scope.releaseProbe = null;
            ipcMain.removeHandler('STREAM_PROBE_URL');
            ipcMain.handle(
                'STREAM_PROBE_URL',
                async (_event, payload: { url: string }) => {
                    scope.testCalls.push(payload);
                    await new Promise<void>((resolve) => {
                        scope.releaseProbe = resolve;
                    });
                    return { status: 200, url: payload.url, latencyMs: 1 };
                }
            );
        });
        await openSources(page);
        await sourceRowByTitle(page, 'testing-settings').first().click();
        await waitForM3uCatalog(page);
        await openWorkspaceSection(page, 'Groups');
        await page
            .locator('.group-nav-item')
            .first()
            .click({ button: 'right' });
        await page
            .getByRole('menuitem', { name: 'Test all channels in group' })
            .click();
        const calls = () =>
            app.electronApp.evaluate(
                () =>
                    (globalThis as typeof globalThis & { testCalls: unknown[] })
                        .testCalls
            );
        await expect.poll(calls).toHaveLength(1);
        expect((await calls())[0]).toEqual(
            expect.objectContaining({
                method: 'GET',
                timeoutMs: 4000,
                rangeBytes: 16384,
            })
        );
        await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Stop checks' })
            .click();
        await app.electronApp.evaluate(() =>
            (
                globalThis as typeof globalThis & { releaseProbe: () => void }
            ).releaseProbe()
        );
        await expect(
            page.getByRole('dialog').getByText('1 / 2 checked')
        ).toBeVisible();
        expect(await calls()).toHaveLength(1);
        await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Close', exact: true })
            .click();
        await page
            .locator('.group-nav-item')
            .first()
            .click({ button: 'right' });
        await page
            .getByRole('menuitem', { name: 'Test all channels in group' })
            .click();
        await expect.poll(calls).toHaveLength(2);
        await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Stop checks' })
            .click();
        await app.electronApp.evaluate(() =>
            (
                globalThis as typeof globalThis & { releaseProbe: () => void }
            ).releaseProbe()
        );
    } finally {
        await closeElectronApp(app);
    }
});
