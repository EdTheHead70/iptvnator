import { test } from '@playwright/test';

import { runM3uRefreshCancellationBenchmark } from './performance/m3u-refresh-cancellation.benchmark';

test('profiles cancellation of a 100k M3U refresh', async () => {
    await runM3uRefreshCancellationBenchmark();
});
