import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    closeElectronApp,
    expect,
    importM3uPlaylistFromNativeDialog,
    launchElectronApp,
    openWorkspaceSection,
    test,
    waitForM3uCatalog,
} from './electron-test-fixtures';

const GROUP =
    'A very long group name that should remain readable when the groups rail is narrow';
const CHANNEL =
    'A very long channel name that should remain readable when the channel list is narrow';

for (const theme of ['light', 'dark']) {
    test(`M3U group names and channel tests (${theme})`, async ({
        dataDir,
    }) => {
        const app = await launchElectronApp(dataDir);
        try {
            const page = app.mainWindow;
            await app.electronApp.evaluate(({ ipcMain }) => {
                const scope = globalThis as typeof globalThis & {
                    groupProbeCalls: {
                        url: string;
                        method: string;
                        userAgent?: string;
                    }[];
                };
                scope.groupProbeCalls = [];
                ipcMain.removeHandler('STREAM_PROBE_URL');
                ipcMain.handle(
                    'STREAM_PROBE_URL',
                    (
                        _event,
                        payload: {
                            url: string;
                            method: string;
                            userAgent?: string;
                        }
                    ) => {
                        scope.groupProbeCalls.push(payload);
                        return {
                            status: payload.url.endsWith('/ok')
                                ? 200
                                : payload.url.endsWith('/missing')
                                  ? 404
                                  : 0,
                            url: payload.url,
                            latencyMs: 1,
                        };
                    }
                );
            });
            const path = join(dataDir, 'groups.m3u');
            writeFileSync(
                path,
                [
                    '#EXTM3U',
                    `#EXTINF:-1 group-title="${GROUP}",${CHANNEL}`,
                    '#EXTVLCOPT:http-user-agent=Group Agent',
                    'https://example.test/ok',
                    `#EXTINF:-1 group-title="${GROUP}",Missing`,
                    'https://example.test/missing',
                    `#EXTINF:-1 group-title="${GROUP}",Unverified`,
                    'https://example.test/unknown',
                    '#EXTINF:-1 group-title="Other",Other channel',
                    'https://example.test/other',
                ].join('\n')
            );
            await importM3uPlaylistFromNativeDialog(app, path);
            await waitForM3uCatalog(page);
            await openWorkspaceSection(page, 'Groups');
            await page.evaluate(
                (dark) => document.body.classList.toggle('dark-theme', dark),
                theme === 'dark'
            );
            const group = page
                .locator('.group-nav-item')
                .filter({ hasText: 'A Very Long Group' });
            await group.hover();
            await expect(
                page
                    .locator('.mat-mdc-tooltip-surface')
                    .filter({ hasText: GROUP })
            ).toHaveText(GROUP);
            await page
                .locator('.channel-name')
                .filter({ hasText: CHANNEL })
                .hover();
            await expect(
                page
                    .locator('.mat-mdc-tooltip-surface')
                    .filter({ hasText: CHANNEL })
            ).toContainText(CHANNEL);
            const selected = await page
                .locator('.group-nav-item[aria-current="true"]')
                .getAttribute('data-group-key');
            await group.click({ button: 'right' });
            await page
                .getByRole('menuitem', { name: 'Test all channels in group' })
                .click();
            const dialog = page.getByRole('dialog');
            await expect(dialog.getByText('3 / 3 checked')).toBeVisible();
            await expect(dialog.locator('[data-status="ok"]')).toHaveCount(1);
            await expect(dialog.locator('[data-status="fail"]')).toHaveCount(1);
            await expect(dialog.locator('[data-status="unknown"]')).toHaveCount(
                1
            );
            const calls = await app.electronApp.evaluate(
                () =>
                    (
                        globalThis as typeof globalThis & {
                            groupProbeCalls: {
                                url: string;
                                userAgent?: string;
                            }[];
                        }
                    ).groupProbeCalls
            );
            expect(calls).toHaveLength(3);
            expect(
                calls.find((call) => call.url.endsWith('/ok'))?.userAgent
            ).toBe('Group Agent');
            expect(calls.some((call) => call.url.endsWith('/other'))).toBe(
                false
            );
            await page.screenshot({
                path: test.info().outputPath(`group-probe-${theme}.png`),
                animations: 'disabled',
            });
            await dialog
                .getByRole('button', { name: 'Close', exact: true })
                .click();
            await expect(
                page.locator('.group-nav-item[aria-current="true"]')
            ).toHaveAttribute('data-group-key', selected ?? '');
            await expect(page.locator('app-web-player-view')).toHaveCount(0);
        } finally {
            await closeElectronApp(app);
        }
    });
}
