/** Settings for explicit group reachability tests, never media playback. */
export interface StreamTestingSettings {
    concurrency: number;
    timeoutSeconds: number;
    method: 'HEAD' | 'GET';
    headFallback: boolean;
    rangeBytes: number;
    cacheSeconds: number;
}
export interface StreamProbeRequestOptions {
    timeoutMs?: number;
    rangeBytes?: number;
}
export const DEFAULT_STREAM_TESTING_SETTINGS: Readonly<StreamTestingSettings> =
    {
        concurrency: 2,
        timeoutSeconds: 10,
        method: 'HEAD',
        headFallback: true,
        rangeBytes: 4096,
        cacheSeconds: 30,
    };
export function normalizeStreamTestingSettings(
    value: unknown
): StreamTestingSettings {
    const input =
        value && typeof value === 'object'
            ? (value as Partial<StreamTestingSettings>)
            : {};
    const integer = (
        value: unknown,
        fallback: number,
        min: number,
        max: number
    ) =>
        typeof value === 'number' && Number.isFinite(value)
            ? Math.min(max, Math.max(min, Math.round(value)))
            : fallback;
    const defaults = DEFAULT_STREAM_TESTING_SETTINGS;
    return {
        concurrency: integer(input.concurrency, defaults.concurrency, 1, 8),
        timeoutSeconds: integer(
            input.timeoutSeconds,
            defaults.timeoutSeconds,
            1,
            60
        ),
        method:
            input.method === 'GET' || input.method === 'HEAD'
                ? input.method
                : defaults.method,
        headFallback:
            typeof input.headFallback === 'boolean'
                ? input.headFallback
                : defaults.headFallback,
        rangeBytes: integer(
            input.rangeBytes,
            defaults.rangeBytes,
            1024,
            1048576
        ),
        cacheSeconds: integer(
            input.cacheSeconds,
            defaults.cacheSeconds,
            0,
            3600
        ),
    };
}
