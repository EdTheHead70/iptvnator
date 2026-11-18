import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmbeddedMpvDockLabelDirective } from './embedded-mpv-dock-label.directive';

@Component({
    imports: [EmbeddedMpvDockLabelDirective],
    template: `<div appEmbeddedMpvDockLabel #help="embeddedMpvDockLabel">
            <button aria-label="Play"><span>icon</span></button>
            <button aria-label="Mute">mute</button>
            <button title="Audio track">track</button>
            <output>{{ help.label() }}</output>
        </div>
        <button aria-label="Outside">outside</button>`,
})
class Host {}

describe('Embedded MPV dock button labels', () => {
    it('shows nested hover targets and falls back to the focused button', async () => {
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const root: HTMLElement = fixture.nativeElement;
        const buttons = root.querySelectorAll('button');
        const dock = root.querySelector('div') as HTMLDivElement;
        const label = () => {
            fixture.detectChanges();
            return (root.querySelector('output') as HTMLOutputElement)
                .textContent;
        };
        (buttons[0].querySelector('span') as HTMLSpanElement).dispatchEvent(
            new MouseEvent('mouseover', { bubbles: true })
        );
        expect(label()).toBe('Play');
        buttons[0].setAttribute('aria-label', 'Pause');
        await new Promise<void>(queueMicrotask);
        expect(label()).toBe('Pause');
        buttons[1].dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        dock.dispatchEvent(new MouseEvent('mouseleave'));
        expect(label()).toBe('Mute');
        buttons[1].dispatchEvent(
            new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: buttons[3],
            })
        );
        expect(label()).toBe('');
        buttons[2].dispatchEvent(
            new MouseEvent('mouseover', { bubbles: true })
        );
        expect(label()).toBe('Audio track');
        dock.dispatchEvent(new MouseEvent('mouseleave'));
        expect(label()).toBe('');
        fixture.destroy();
    });
});
