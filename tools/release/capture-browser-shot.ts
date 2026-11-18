import path from 'node:path';
import { chromium } from '@playwright/test';
import {
    evaluateFrameReport,
    isAllowedRequestUrl,
} from './screenshot-guards.mjs';

export type Theme = 'dark' | 'light';

export interface BrowserShot {
    url: string;
    viewport: { width: number; height: number };
}

/** Runs inside the page: every image/background URL plus the visible text, for G4. */
export function collectFrameReport(): {
    resourceUrls: string[];
    bodyText: string;
} {
    const urls = new Set<string>();

    document.querySelectorAll('img[src]').forEach((img) => {
        urls.add((img as HTMLImageElement).src);
    });
    document.querySelectorAll<HTMLElement>('*').forEach((element) => {
        const background = getComputedStyle(element).backgroundImage;
        const match = background?.match(/url\("?([^")]+)"?\)/);

        if (match) {
            urls.add(match[1]);
        }
    });

    return {
        resourceUrls: [...urls],
        bodyText: document.body.innerText,
    };
}

/**
 * A `browser` shot frames a page the app serves to other devices — the
 * remote control's phone view — in a separate mobile-sized Chromium instead of
 * the Electron window. It sits behind the same gates: the page may only load
 * from loopback (deny-by-default route, violations feed G3), and its DOM is
 * inspected by G4 before the frame is written.
 */
export async function captureBrowserShot(
    shot: BrowserShot,
    outputRoot: string,
    slug: string,
    theme: Theme,
    blocked: string[]
): Promise<void> {
    const browser = await chromium.launch();

    try {
        const context = await browser.newContext({
            viewport: shot.viewport,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            colorScheme: theme,
        });
        const page = await context.newPage();

        await page.route('**/*', async (route) => {
            const url = route.request().url();

            if (isAllowedRequestUrl(url)) {
                await route.continue();
                return;
            }

            blocked.push(url);
            await route.abort();
        });

        await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 30_000 });
        // The remote polls its status every two seconds; give the first
        // answer time to replace the "No live stream selected" placeholder
        // when a channel is playing, without failing shots that frame the
        // idle state on purpose.
        await page
            .locator('.now-card__channel')
            .filter({ hasNotText: 'No live stream selected' })
            .first()
            .waitFor({ state: 'visible', timeout: 8_000 })
            .catch(() => undefined);
        await page.waitForTimeout(500);

        const report = await page.evaluate(collectFrameReport);
        const violations = evaluateFrameReport(report);

        if (violations.length > 0) {
            throw new Error(
                `G4 failed on ${slug} (${theme}):\n  ${violations.join('\n  ')}`
            );
        }

        // Not `fullPage`: the remote scrolls inside its own container, so a
        // full-page frame only pads the document with empty background while
        // the container stays clipped. The manifest viewport is tall enough
        // for the whole remote instead.
        await page.screenshot({
            path: path.join(outputRoot, `${slug}-${theme}.png`),
            type: 'png',
        });
        console.log(
            `  ✓ ${slug} (${theme}, browser ${shot.viewport.width}×${shot.viewport.height})`
        );
    } finally {
        await browser.close();
    }
}
