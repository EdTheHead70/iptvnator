import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatButtonModule } from '@angular/material/button';
import {
    MAT_DIALOG_DATA,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { StreamProbeService } from '@iptvnator/services';
import {
    Channel,
    VodSourceProbeResult,
    StreamTestingSettings,
    normalizeStreamTestingSettings,
} from '@iptvnator/shared/interfaces';
import {
    ExternalPlayerHeaderFallback,
    resolveExternalPlayerHttpHeaders,
} from '@iptvnator/m3u-state';
import { DialogShellComponent } from '../../dialog-shell/dialog-shell.component';
import { DialogFooterDirective } from '../../dialog-shell/dialog-shell.directives';

export interface GroupStreamTestData {
    groupName: string;
    channels: Channel[];
    settings?: Partial<StreamTestingSettings>;
    playlistHeaders?: ExternalPlayerHeaderFallback | null;
}

@Component({
    selector: 'app-group-stream-test-dialog',
    templateUrl: './group-stream-test-dialog.component.html',
    styleUrl: './group-stream-test-dialog.component.scss',
    imports: [
        DialogShellComponent,
        DialogFooterDirective,
        MatDialogModule,
        MatButtonModule,
        MatTooltipModule,
        ScrollingModule,
        TranslatePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupStreamTestDialogComponent {
    readonly data = inject<GroupStreamTestData>(MAT_DIALOG_DATA);
    private readonly probe = inject(StreamProbeService);
    private readonly ref = inject(MatDialogRef<GroupStreamTestDialogComponent>);
    readonly settings = normalizeStreamTestingSettings(this.data.settings);
    private disposed = false;
    private nextIndex = 0;
    readonly stopped = signal(false);
    readonly running = signal(true);
    readonly counts = signal({ ok: 0, fail: 0, unknown: 0 });
    readonly checked = computed(() => {
        const counts = this.counts();
        return counts.ok + counts.fail + counts.unknown;
    });
    readonly rows = this.data.channels.map((channel) => ({
        channel,
        result: signal<VodSourceProbeResult>({ status: 'idle' }),
    }));

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            this.disposed = true;
        });
        void Promise.all(
            Array.from(
                {
                    length: Math.min(
                        this.settings.concurrency,
                        this.rows.length
                    ),
                },
                () => this.worker()
            )
        ).finally(() => {
            if (!this.disposed) this.running.set(false);
        });
    }
    stop(): void {
        this.stopped.set(true);
    }
    close(): void {
        this.stop();
        this.ref.close();
    }
    statusKey(result: VodSourceProbeResult): string {
        if (result.status === 'idle') return 'CHANNELS.GROUP_TEST_PENDING';
        if (result.status === 'probing')
            return 'PORTALS.MULTI_SOURCE.PROBE_CHECKING';
        if (result.status === 'ok') return 'PORTALS.MULTI_SOURCE.PROBE_OK';
        if (result.status === 'fail') return 'PORTALS.MULTI_SOURCE.PROBE_FAIL';
        return 'CHANNELS.GROUP_TEST_UNKNOWN';
    }
    private async worker(): Promise<void> {
        while (!this.stopped() && !this.disposed) {
            const row = this.rows[this.nextIndex++];
            if (!row) return;
            row.result.set({ status: 'probing' });
            const headers = resolveExternalPlayerHttpHeaders(
                row.channel,
                this.data.playlistHeaders
            );
            let result: VodSourceProbeResult;
            try {
                result = await this.probe.probe(
                    row.channel.url,
                    this.settings.method,
                    {
                        userAgent: headers['user-agent'],
                        referer: headers.referer,
                        origin: headers.origin,
                    },
                    this.settings
                );
            } catch {
                result = { status: 'unknown' };
            }
            if (this.disposed) return;
            row.result.set(result);
            const status =
                result.status === 'ok' || result.status === 'fail'
                    ? result.status
                    : 'unknown';
            this.counts.update((counts) => ({
                ...counts,
                [status]: counts[status] + 1,
            }));
        }
    }
}
