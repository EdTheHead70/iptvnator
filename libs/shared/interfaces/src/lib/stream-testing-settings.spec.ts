import {
    DEFAULT_STREAM_TESTING_SETTINGS,
    normalizeStreamTestingSettings,
} from './stream-testing-settings';
describe('stream testing settings normalization', () => {
    it('preserves defaults for old settings and malformed data', () => {
        for (const value of [undefined, null, {}, 'junk'])
            expect(normalizeStreamTestingSettings(value)).toEqual(
                DEFAULT_STREAM_TESTING_SETTINGS
            );
    });
    it('bounds imported values without allowing unbounded probing', () => {
        expect(
            normalizeStreamTestingSettings({
                concurrency: 999,
                timeoutSeconds: -5,
                method: 'POST',
                headFallback: false,
                rangeBytes: 99999999,
                cacheSeconds: -1,
            })
        ).toEqual({
            concurrency: 8,
            timeoutSeconds: 1,
            method: 'HEAD',
            headFallback: false,
            rangeBytes: 1048576,
            cacheSeconds: 0,
        });
    });
});
