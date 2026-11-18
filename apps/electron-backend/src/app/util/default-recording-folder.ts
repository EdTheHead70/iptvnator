import { app } from 'electron';
import { mkdirSync } from 'fs';
import path from 'path';

/** The per-platform default destination for live stream recordings. */
export function defaultRecordingFolderPath(): string {
    return path.join(app.getPath('videos'), 'IPTVNator');
}

/**
 * Creates the default recording folder once per app run so Settings and the
 * folder picker point at a real directory.
 */
export function ensureDefaultRecordingFolder(): void {
    try {
        mkdirSync(defaultRecordingFolderPath(), { recursive: true });
    } catch (error) {
        console.warn('Could not create the default recording folder:', error);
    }
}
