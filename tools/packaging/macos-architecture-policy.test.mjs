import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { assertMacosTargetArchitecture as check } from './macos-architecture-policy.cjs';
import beforePack from './electron-before-pack.cjs';

test('older and unspecified macOS targets retain Intel builds', () => {
    for (const version of [undefined, '', '11.0', '26.9']) {
        assert.doesNotThrow(() => check('x64', version));
    }
});
test('macOS 27 and later require arm64', () => {
    for (const version of ['27', '27.0', '27.1.2', '28.0']) {
        assert.throws(() => check('x64', version), /require arm64/);
        assert.doesNotThrow(() => check('arm64', version));
    }
});
test('malformed targets cannot bypass the policy', () => {
    assert.throws(() => check('x64', '27.invalid'), /Invalid macOS/);
});
test('packaging enforces its minimum OS and leaves other platforms alone', () => {
    const context = {
        electronPlatformName: 'darwin',
        arch: 1,
        packager: {
            platformSpecificBuildOptions: { minimumSystemVersion: '27.0' },
        },
    };
    assert.throws(() => beforePack(context), /require arm64/);
    assert.doesNotThrow(() => beforePack({ ...context, arch: 3 }));
    assert.doesNotThrow(() =>
        beforePack({ ...context, electronPlatformName: 'linux' })
    );
});

test('native build rejects Intel macOS 27 before compiling', () => {
    const result = spawnSync(
        process.execPath,
        ['apps/electron-backend/build-embedded-mpv.js'],
        {
            encoding: 'utf8',
            env: {
                ...process.env,
                IPTVNATOR_EMBEDDED_MPV_PLATFORM: 'darwin',
                IPTVNATOR_EMBEDDED_MPV_ARCH: 'x64',
                MACOSX_DEPLOYMENT_TARGET: '27.0',
            },
        }
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /require arm64/);
});
test('electron-builder registers the architecture guard', () => {
    const config = JSON.parse(
        readFileSync(
            new URL('../../electron-builder.json', import.meta.url),
            'utf8'
        )
    );
    assert.equal(
        config.beforePack,
        './tools/packaging/electron-before-pack.cjs'
    );
});
