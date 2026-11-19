import { favoritesConsentKey } from '../services/favorites-consent';
import {
    ChangeDetectionStrategy,
    Component,
    EnvironmentInjector,
    inject,
    signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsSyncStatusComponent } from './settings-sync-status.component';
import { loadFavoritesRuntime } from '../services/favorites-sync.providers';
import {
    favoriteAddressKey,
    type FavoriteAddress,
    type FavoriteEntry,
} from '@iptvnator/shared/interfaces/favorites-sync';
import type {
    FavoritesSyncRuntime,
    FavoritesImportPreview,
} from '../services/favorites-sync-runtime';
@Component({
    selector: 'app-settings-favorites-section',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatCheckboxModule,
        TranslateModule,
        SettingsSyncStatusComponent,
    ],
    templateUrl: './settings-favorites-section.component.html',
    styleUrl: './settings-favorites-section.component.scss',
})
export class SettingsFavoritesSectionComponent {
    readonly runtime = signal<FavoritesSyncRuntime | null>(null);
    readonly failed = signal(false);
    readonly busy = signal(false);
    readonly preview = signal<FavoritesImportPreview | null>(null);
    readonly unresolved = signal(0);
    readonly addressKey = favoriteAddressKey;
    readonly count = () =>
        this.preview()?.sources.reduce(
            (count, source) => count + source.items.length,
            0
        ) ?? 0;
    constructor() {
        if (!favoritesConsentKey()) return;
        void loadFavoritesRuntime(inject(EnvironmentInjector))
            .then((runtime) => this.runtime.set(runtime))
            .catch(() => this.failed.set(true));
    }
    conflictTitle(entry: FavoriteEntry): string {
        const title =
            entry.record.state.snapshot?.title ??
            entry.record.local?.snapshot?.title ??
            entry.record.conflict?.snapshot?.title;
        if (title) return title;
        const ref = entry.address.content;
        return ref.provider === 'm3u'
            ? `M3U · ${ref.urlHash.slice(0, 12)}`
            : `${ref.provider} · ${ref.kind} · ${ref.id}${ref.provider === 'stalker' && ref.mode ? ` · ${ref.mode}` : ''}`;
    }
    async toggle(change: { checked: boolean; source: { checked: boolean } }) {
        await this.action((runtime) => runtime.setEnabled(change.checked));
        change.source.checked = this.runtime()?.enabled() ?? false;
        this.preview.set(null);
    }
    async previewImport() {
        await this.action(async (runtime) =>
            this.preview.set(await runtime.previewImport())
        );
    }
    async importFavorites() {
        await this.action(async (runtime) => {
            const preview = this.preview();
            if (!preview) return;
            this.unresolved.set(await runtime.importFavorites(preview));
            this.preview.set(null);
        });
    }
    async resolve(address: FavoriteAddress, local: boolean) {
        await this.action((runtime) => runtime.resolve(address, local));
    }
    async parked(send: boolean) {
        await this.action((runtime) => runtime.parked(send));
    }
    async refresh() {
        await this.action((runtime) => runtime.refresh());
    }
    private async action(
        run: (runtime: FavoritesSyncRuntime) => Promise<unknown>
    ) {
        const runtime = this.runtime();
        if (this.busy() || !runtime) return;
        this.busy.set(true);
        this.failed.set(false);
        try {
            await run(runtime);
        } catch {
            this.failed.set(true);
        } finally {
            this.busy.set(false);
        }
    }
}
