export const EMBEDDED_MPV_EXPERIMENT_ENV =
    'IPTVNATOR_ENABLE_EMBEDDED_MPV_EXPERIMENT';

/**
 * Embedded MPV is enabled for every desktop build. Runtime support detection
 * still decides whether the engine can start and whether the option is shown.
 * Packaged releases ship the vendored libmpv runtime; local development can use
 * the Homebrew fallback.
 */
export function isEmbeddedMpvFeatureEnabled(): boolean {
    return true;
}
