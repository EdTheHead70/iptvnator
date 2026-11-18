import {
    Directive,
    ElementRef,
    inject,
    OnDestroy,
    signal,
} from '@angular/core';

/** Keeps native-view button help in the dock, below the platform video view. */
@Directive({
    selector: '[appEmbeddedMpvDockLabel]',
    exportAs: 'embeddedMpvDockLabel',
    host: {
        '(mouseover)': 'onHover($event.target)',
        '(mouseleave)': 'onHover(null)',
        '(focusin)': 'onFocus($event.target)',
        '(focusout)': 'onFocus($event.relatedTarget)',
    },
})
export class EmbeddedMpvDockLabelDirective implements OnDestroy {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private hovered: HTMLElement | null = null;
    private focused: HTMLElement | null = null;
    readonly label = signal('');

    private readonly observer = new MutationObserver(() => this.updateLabel());

    constructor() {
        this.observer.observe(this.host.nativeElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['aria-label', 'title'],
        });
    }

    ngOnDestroy(): void {
        this.observer.disconnect();
    }

    onHover(target: EventTarget | null): void {
        this.hovered = this.button(target);
        this.updateLabel();
    }

    onFocus(target: EventTarget | null): void {
        this.focused = this.button(target);
        this.updateLabel();
    }

    private button(target: EventTarget | null): HTMLElement | null {
        const button =
            target instanceof Element ? target.closest('button') : null;
        return button instanceof HTMLElement &&
            this.host.nativeElement.contains(button)
            ? button
            : null;
    }

    private updateLabel(): void {
        this.hovered = this.button(this.hovered);
        this.focused = this.button(this.focused);
        const button = this.hovered ?? this.focused;
        this.label.set(
            button?.getAttribute('aria-label') ??
                button?.getAttribute('title') ??
                ''
        );
    }
}
