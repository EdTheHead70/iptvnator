/** macOS 27+ deployment targets support Apple Silicon builds only. */
function assertMacosTargetArchitecture(arch, deploymentTarget) {
    if (deploymentTarget == null || deploymentTarget === '') return;
    const version = String(deploymentTarget);
    if (!/^\d+(?:\.\d+){0,2}$/.test(version)) {
        throw new Error(`Invalid macOS deployment target: ${version}`);
    }
    if (Number(version.split('.')[0]) >= 27 && arch !== 'arm64') {
        throw new Error(
            `macOS ${version} targets require arm64; received ${arch}. Use arm64 or target an older macOS version for Intel builds.`
        );
    }
}

module.exports = { assertMacosTargetArchitecture };
