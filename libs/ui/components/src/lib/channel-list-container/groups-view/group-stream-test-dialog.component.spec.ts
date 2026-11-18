import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StreamProbeService } from '@iptvnator/services';
import { Channel, VodSourceProbeResult } from '@iptvnator/shared/interfaces';
import {
    GroupStreamTestDialogComponent,
    GroupStreamTestData,
} from './group-stream-test-dialog.component';

const channels = Array.from(
    { length: 4 },
    (_, i) =>
        ({
            id: String(i),
            name: `Channel ${i}`,
            url: `https://example.test/${i}`,
            http: {
                'user-agent': i === 0 ? 'Entry Agent' : '',
                referrer: '',
                origin: '',
            },
        }) as Channel
);
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('GroupStreamTestDialogComponent', () => {
    let fixture: ComponentFixture<GroupStreamTestDialogComponent>;
    let probe: jest.Mock;
    let data: GroupStreamTestData;
    beforeEach(async () => {
        probe = jest.fn();
        data = {
            groupName: 'Group',
            channels,
            playlistHeaders: {
                userAgent: 'Playlist Agent',
                referrer: 'https://example.test',
                origin: 'https://origin.test',
            },
        };
        await TestBed.configureTestingModule({
            imports: [GroupStreamTestDialogComponent],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: { close: jest.fn() } },
                { provide: StreamProbeService, useValue: { probe } },
            ],
        })
            .overrideComponent(GroupStreamTestDialogComponent, {
                set: { template: '' },
            })
            .compileComponents();
    });
    afterEach(() => fixture?.destroy());

    it('checks every entry, preserves playback headers and distinguishes unknown from unavailable', async () => {
        probe
            .mockResolvedValueOnce({ status: 'ok', httpStatus: 200 })
            .mockResolvedValueOnce({ status: 'fail', httpStatus: 404 })
            .mockResolvedValueOnce({ status: 'unknown' })
            .mockRejectedValueOnce(new Error('network'));
        fixture = TestBed.createComponent(GroupStreamTestDialogComponent);
        await flush();
        const component = fixture.componentInstance;
        expect(probe).toHaveBeenCalledTimes(4);
        expect(probe).toHaveBeenNthCalledWith(
            1,
            channels[0].url,
            'HEAD',
            {
                userAgent: 'Entry Agent',
                referer: 'https://example.test',
                origin: 'https://origin.test',
            },
            expect.objectContaining({ concurrency: 2, timeoutSeconds: 10 })
        );
        expect(probe).toHaveBeenNthCalledWith(
            2,
            channels[1].url,
            'HEAD',
            {
                userAgent: 'Playlist Agent',
                referer: 'https://example.test',
                origin: 'https://origin.test',
            },
            expect.objectContaining({ concurrency: 2, timeoutSeconds: 10 })
        );
        expect(component.counts()).toEqual({ ok: 1, fail: 1, unknown: 2 });
        expect(component.checked()).toBe(4);
        expect(component.running()).toBe(false);
        expect(component.rows[3].result().status).toBe('unknown');
    });

    it('honors a saved single-worker GET test configuration', async () => {
        let release!: (value: VodSourceProbeResult) => void;
        data.settings = {
            concurrency: 1,
            method: 'GET',
            timeoutSeconds: 4,
            rangeBytes: 1024,
            cacheSeconds: 0,
            headFallback: false,
        };
        probe.mockReturnValue(
            new Promise<VodSourceProbeResult>((resolve) => {
                release = resolve;
            })
        );
        fixture = TestBed.createComponent(GroupStreamTestDialogComponent);
        expect(probe).toHaveBeenCalledTimes(1);
        expect(probe.mock.calls[0][1]).toBe('GET');
        expect(probe.mock.calls[0][3]).toEqual(data.settings);
        fixture.componentInstance.stop();
        release({ status: 'ok' });
        await flush();
        expect(probe).toHaveBeenCalledTimes(1);
    });

    it('bounds concurrency to two and stops scheduling when Stop is pressed', async () => {
        let release!: (value: VodSourceProbeResult) => void;
        probe.mockReturnValue(
            new Promise<VodSourceProbeResult>((resolve) => {
                release = resolve;
            })
        );
        fixture = TestBed.createComponent(GroupStreamTestDialogComponent);
        expect(probe).toHaveBeenCalledTimes(2);
        fixture.componentInstance.stop();
        release({ status: 'ok' });
        await flush();
        expect(probe).toHaveBeenCalledTimes(2);
        expect(fixture.componentInstance.checked()).toBe(2);
        expect(fixture.componentInstance.rows[2].result().status).toBe('idle');
        expect(fixture.componentInstance.running()).toBe(false);
    });

    it('does not update results or start further probes after the dialog is destroyed', async () => {
        let release!: (value: VodSourceProbeResult) => void;
        probe.mockReturnValue(
            new Promise<VodSourceProbeResult>((resolve) => {
                release = resolve;
            })
        );
        fixture = TestBed.createComponent(GroupStreamTestDialogComponent);
        const component = fixture.componentInstance;
        fixture.destroy();
        release({ status: 'ok' });
        await flush();
        expect(component.checked()).toBe(0);
        expect(probe).toHaveBeenCalledTimes(2);
    });
});
