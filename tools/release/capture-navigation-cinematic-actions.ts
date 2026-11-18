/** Real navigation and activity for the opt-in cinematic screenshot preset. */
import type { Locator, Page } from '@playwright/test';
import { XTREAM_MOCK_ORIGIN } from './capture-fixtures';
import {
    type CaptureAction,
    openXtreamSection,
    requirePlaylistId,
} from './capture-navigation-helpers';
import {
    assertCinematicLiveFrame,
    setCinematicLiveFavorites,
    waitForCinematicLiveEpg,
} from './capture-cinematic-live';

/** Detail shots must show the synopsis expanded, not its clamped preview. */
const SYNOPSIS_TOGGLE = 'app-content-hero .details__description-toggle';
const SYNOPSIS_DETAIL_SLUGS = new Set([
    'xtream-vod-details',
    'xtream-series-season-open',
]);

/** Matches the mock's marketing asset path for the curated fixture titles. */
const marketingBackdrop = (title: string): string =>
    `${XTREAM_MOCK_ORIGIN}/assets/marketing/backdrop/${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}.svg`;

export async function seedCinematicActivity(page: Page): Promise<void> {
    const playlistId = requirePlaylistId('xtreams');
    const items = [62003, 62004, 62005, 62006, 62007, 62008, 62009];
    // These four cards need a backdrop the imported rows do not carry. Their
    // ids follow the fixture's showcase order, so the title check below fails
    // the run if that order moves instead of pairing a card with the wrong art.
    const resumeItems = [
        { id: 62003, title: 'House of Tides', positionSeconds: 1340 },
        { id: 62002, title: 'Summer Static', positionSeconds: 2040 },
        { id: 62001, title: 'The Paper Astronaut', positionSeconds: 940 },
        { id: 62000, title: 'Black Harbor', positionSeconds: 1860 },
    ].map((item) => ({
        ...item,
        backdropUrl: marketingBackdrop(item.title),
    }));
    await page.evaluate(
        async ({ playlistId, items, resumeItems }) => {
            const bridge = window.electron;
            if (!bridge?.dbAddFavorite || !bridge.dbSavePlaybackPosition)
                throw new Error('Activity bridge unavailable');
            for (const id of items) {
                const content = await bridge.dbGetContentByXtreamId(
                    id,
                    playlistId,
                    'movie'
                );
                if (!content) throw new Error(`Demo content missing: ${id}`);
                await bridge.dbAddFavorite(content.id, playlistId);
            }
            for (const id of [62004, 62005, 62006]) {
                const content = await bridge.dbGetContentByXtreamId(
                    id,
                    playlistId,
                    'movie'
                );
                if (!content)
                    throw new Error(`Demo resume content missing: ${id}`);
                await bridge.dbAddRecentItem(content.id, playlistId);
                await bridge.dbSavePlaybackPosition(playlistId, {
                    contentXtreamId: id,
                    contentType: 'vod',
                    positionSeconds: 780 + (id - 62004) * 420,
                    durationSeconds: 6840,
                });
            }
            for (const item of resumeItems) {
                const content = await bridge.dbGetContentByXtreamId(
                    item.id,
                    playlistId,
                    'movie'
                );
                if (!content)
                    throw new Error(`Demo resume content missing: ${item.id}`);
                if (content.title !== item.title)
                    throw new Error(
                        `Demo fixture order changed: ${item.id} is ` +
                            `"${content.title}", expected "${item.title}"`
                    );
                await bridge.dbAddRecentItem(
                    content.id,
                    playlistId,
                    item.backdropUrl
                );
                await bridge.dbSavePlaybackPosition(playlistId, {
                    contentXtreamId: item.id,
                    contentType: 'vod',
                    positionSeconds: item.positionSeconds,
                    durationSeconds: 6840,
                });
            }
        },
        { playlistId, items, resumeItems }
    );
}

export async function openCinematicDashboard(page: Page): Promise<void> {
    await setCinematicLiveFavorites(page, false);
    await showCinematicDashboard(page);
}

export async function openCinematicLiveDashboard(page: Page): Promise<void> {
    await setCinematicLiveFavorites(page, true);
    await showCinematicDashboard(page);
    await waitForCinematicLiveEpg(page);
}

async function showCinematicDashboard(page: Page): Promise<void> {
    await page
        .locator('app-workspace-shell-rail a[href$="/workspace/dashboard"]')
        .click();
    const hero = page.locator('[data-test-id="dashboard-hero"]');
    await hero.waitFor({ state: 'visible', timeout: 30_000 });
    await hero.hover();
    const pause = hero.locator('[data-test-id="dashboard-hero-pause"]');
    if (
        (await pause.count()) &&
        (await pause.getAttribute('aria-pressed')) !== 'true'
    )
        await pause.click();
    await hero
        .locator(
            '[data-test-id="dashboard-hero-dot"][aria-label*="Black Harbor"]'
        )
        .click();
    await page.waitForFunction(
        () => {
            const slide = document.querySelector(
                '[data-test-id="dashboard-hero-slide"]'
            );
            return (
                slide?.querySelector('.hero__title')?.textContent?.trim() ===
                    'Black Harbor' &&
                (slide.querySelector('.hero__description')?.textContent
                    ?.length ?? 0) > 100
            );
        },
        undefined,
        { timeout: 20_000 }
    );
    await page
        .locator('[data-test-id="dashboard-continue-watching-rail"]')
        .waitFor();
    await page.mouse.move(0, 0);
}

export async function openCinematicMovie(page: Page): Promise<void> {
    await openCinematicDashboard(page);
    await page
        .locator('[data-test-id="dashboard-favorite-vod-rail"] .rail__card')
        .filter({ hasText: 'Black Harbor' })
        .locator('a.rail__card-link')
        .click();
    await page.waitForURL(/\/workspace\/global-favorites/, { timeout: 30_000 });
    await page
        .locator('app-content-hero')
        .filter({ hasText: 'Black Harbor' })
        .waitFor();
    await expandSynopsis(page, 'xtream-vod-details');
}

export async function openCinematicSeries(page: Page): Promise<void> {
    await openXtreamSection(page, 'series', 'Urban Drama', 'Skyline Sentinels');
    await page.locator('app-season-container').waitFor();
    await page
        .locator('.episode-list-item, .episode-card')
        .filter({ hasText: 'The Dawn Shift' })
        .waitFor();
    await expandSynopsis(page, 'xtream-series-season-open');
}

async function expandSynopsis(page: Page, slug: string): Promise<void> {
    const toggle = page.locator(SYNOPSIS_TOGGLE).first();
    try {
        await toggle.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
        throw new Error(
            `Cinematic synopsis toggle missing for ${slug}: ` +
                'the description never became clampable'
        );
    }
    await ensureSynopsisExpanded(page, toggle, slug);
}

/** Expand the toggle and prove it ended expanded; throws otherwise. */
async function ensureSynopsisExpanded(
    page: Page,
    toggle: Locator,
    slug: string
): Promise<void> {
    if ((await toggle.getAttribute('aria-expanded')) === 'true') return;
    await toggle.click();
    try {
        await page.waitForFunction(
            (selector) =>
                document
                    .querySelector(selector)
                    ?.getAttribute('aria-expanded') === 'true',
            SYNOPSIS_TOGGLE,
            { timeout: 5_000 }
        );
    } catch {
        throw new Error(`Cinematic synopsis did not expand for ${slug}`);
    }
}

/** Final frame checks wait for text transitions, font metrics and image decode. */
export async function settleCinematicFrame(
    page: Page,
    slug: string
): Promise<void> {
    await page.mouse.move(0, 0);
    await page.evaluate(() =>
        (document.activeElement as HTMLElement | null)?.blur()
    );
    if (SYNOPSIS_DETAIL_SLUGS.has(slug)) {
        // A late enrichment render can collapse the text after its setup click.
        const toggle = page.locator(SYNOPSIS_TOGGLE).first();
        if (await toggle.count())
            await ensureSynopsisExpanded(page, toggle, slug);
    }
    await page.evaluate(async () => {
        await document.fonts.ready;
        const images = [
            ...document.querySelectorAll<HTMLImageElement>('img'),
        ].filter((image) => {
            const rect = image.getBoundingClientRect();
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom > 0 &&
                rect.top < innerHeight
            );
        });
        await Promise.all(images.map((image) => image.decode()));
    });
    await page.waitForTimeout(600);
    if (slug === 'dashboard' || slug === 'dashboard-live-channels') {
        const title = await page
            .locator('[data-test-id="dashboard-hero-slide"] .hero__title')
            .textContent();
        if (title?.trim() !== 'Black Harbor')
            throw new Error('Cinematic hero changed before capture');
    }
    if (
        slug === 'dashboard' &&
        (await page
            .locator('[data-test-id="dashboard-live-favorites-rail"]')
            .count())
    )
        throw new Error(
            'Live fixtures leaked into the original dashboard variant'
        );
    if (slug === 'dashboard-live-channels')
        await assertCinematicLiveFrame(page);
}

export const CINEMATIC_ACTIONS: Readonly<Record<string, CaptureAction>> = {
    'open-cinematic-dashboard': openCinematicDashboard,
    'open-cinematic-live-dashboard': openCinematicLiveDashboard,
    'open-cinematic-movie': openCinematicMovie,
    'open-cinematic-series': openCinematicSeries,
};
