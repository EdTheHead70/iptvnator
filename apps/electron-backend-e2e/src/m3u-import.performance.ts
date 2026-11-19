import { test } from '@playwright/test';

import { runM3uImportBenchmark } from './performance/m3u-import.benchmark';

test('profiles initial M3U imports at 10k, 50k, and 100k', async () => {
    await runM3uImportBenchmark();
});
