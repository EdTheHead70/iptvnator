const mockElectronApp = {
    isPackaged: false,
};

jest.mock('electron', () => ({ app: mockElectronApp }));

import { isEmbeddedMpvFeatureEnabled } from './embedded-mpv-runtime-policy.util';

describe('embedded-mpv-runtime-policy.util', () => {
    it('enables embedded MPV for packaged apps', () => {
        mockElectronApp.isPackaged = true;
        delete process.env.IPTVNATOR_ENABLE_EMBEDDED_MPV_EXPERIMENT;

        expect(isEmbeddedMpvFeatureEnabled()).toBe(true);
    });

    it.each([undefined, '0', 'false', 'off', '1', 'true', 'yes', 'on'])(
        'enables embedded MPV for unpackaged runs regardless of the legacy opt-in: %s',
        (value) => {
            mockElectronApp.isPackaged = false;
            if (value === undefined) {
                delete process.env.IPTVNATOR_ENABLE_EMBEDDED_MPV_EXPERIMENT;
            } else {
                process.env.IPTVNATOR_ENABLE_EMBEDDED_MPV_EXPERIMENT = value;
            }

            expect(isEmbeddedMpvFeatureEnabled()).toBe(true);
        }
    );
});
