import {
    ChangeDetectionStrategy,
    Component,
    input,
    inject,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { provideFormFieldDefaults } from '@iptvnator/ui/components/form-field-defaults';
import { StreamProbeService } from '@iptvnator/services';
import { markSectionForCheckOnFormEvents } from './settings-section-form-render';

@Component({
    selector: 'app-settings-stream-testing-section',
    templateUrl: './settings-stream-testing-section.component.html',
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        TranslatePipe,
    ],
    providers: [provideFormFieldDefaults()],
    styles: [
        `
            :host {
                display: contents;
            }
            .settings-section__header {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
            .settings-section__header p {
                margin: 0;
                color: var(--app-muted-color);
                font-size: 13px;
            }
        `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsStreamTestingSectionComponent {
    readonly probeAvailable = inject(StreamProbeService).isAvailable;
    readonly form = input.required<FormGroup>();
    get rangeSizes(): number[] {
        const current = this.form().get('streamTesting.rangeBytes')?.value;
        const stored =
            typeof current === 'number' && current >= 1024 && current <= 1048576
                ? [current]
                : [];
        return [
            ...new Set([1024, 4096, 16384, 65536, 262144, 1048576, ...stored]),
        ].sort((a, b) => a - b);
    }
    constructor() {
        markSectionForCheckOnFormEvents(this.form);
    }
}
