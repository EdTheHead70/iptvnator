const {
    assertMacosTargetArchitecture,
} = require('./macos-architecture-policy.cjs');

module.exports = function beforePack(context) {
    if (context.electronPlatformName !== 'darwin') return;
    // electron-builder passes builder-util's numeric Arch enum (arm64 = 3).
    const arch = context.arch === 3 ? 'arm64' : String(context.arch);
    assertMacosTargetArchitecture(
        arch,
        context.packager.platformSpecificBuildOptions.minimumSystemVersion
    );
    assertMacosTargetArchitecture(arch, process.env.MACOSX_DEPLOYMENT_TARGET);
};
