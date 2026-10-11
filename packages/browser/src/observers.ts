import { GlobalInstaller } from './internal/global.js'

function emptyRect(width = 0, height = 0): DOMRectReadOnly {
    const rect = { x: 0, y: 0, width, height, top: 0, right: width, bottom: height, left: 0 }
    return { ...rect, toJSON: () => ({ ...rect }) }
}

export interface IntersectionEntryInit {
    readonly target: Element
    readonly isIntersecting?: boolean
    /** Defaults to 1 when intersecting, otherwise 0. */
    readonly intersectionRatio?: number
    readonly time?: number
}

export interface ResizeEntryInit {
    readonly target: Element
    readonly width: number
    readonly height: number
}

/** IntersectionObserver whose callbacks are fired by the test with `trigger()`. */
export class MockIntersectionObserver {
    private static readonly created: MockIntersectionObserver[] = []
    private static readonly globals = new GlobalInstaller()

    readonly root: Element | Document | null
    readonly rootMargin: string
    readonly thresholds: readonly number[]
    private readonly targets = new Set<Element>()

    constructor(
        private readonly callback: IntersectionObserverCallback,
        options: IntersectionObserverInit = {},
    ) {
        this.root = options.root ?? null
        this.rootMargin = options.rootMargin ?? '0px'
        const threshold = options.threshold ?? 0
        this.thresholds = Array.isArray(threshold) ? threshold : [threshold]
        MockIntersectionObserver.created.push(this)
    }

    static instances(): readonly MockIntersectionObserver[] {
        return [...MockIntersectionObserver.created]
    }

    static reset(): void {
        MockIntersectionObserver.created.length = 0
    }

    /** Replaces the global `IntersectionObserver` constructor. */
    static install(): void {
        MockIntersectionObserver.globals.install('IntersectionObserver', MockIntersectionObserver)
    }

    static uninstall(): void {
        MockIntersectionObserver.globals.uninstall()
    }

    observe(target: Element): void {
        this.targets.add(target)
    }

    unobserve(target: Element): void {
        this.targets.delete(target)
    }

    disconnect(): void {
        this.targets.clear()
    }

    takeRecords(): IntersectionObserverEntry[] {
        return []
    }

    /** Elements currently observed. */
    observed(): readonly Element[] {
        return [...this.targets]
    }

    /** Calls the callback with entries built from the given descriptions. */
    trigger(entries: readonly IntersectionEntryInit[]): void {
        this.callback(entries.map((entry) => this.toEntry(entry)), this)
    }

    private toEntry(init: IntersectionEntryInit): IntersectionObserverEntry {
        const isIntersecting = init.isIntersecting ?? false
        return {
            target: init.target,
            isIntersecting,
            intersectionRatio: init.intersectionRatio ?? (isIntersecting ? 1 : 0),
            time: init.time ?? 0,
            boundingClientRect: emptyRect(),
            intersectionRect: emptyRect(),
            rootBounds: null,
        }
    }
}

/** ResizeObserver whose callbacks are fired by the test with `trigger()`. */
export class MockResizeObserver {
    private static readonly created: MockResizeObserver[] = []
    private static readonly globals = new GlobalInstaller()

    private readonly targets = new Set<Element>()

    constructor(private readonly callback: ResizeObserverCallback) {
        MockResizeObserver.created.push(this)
    }

    static instances(): readonly MockResizeObserver[] {
        return [...MockResizeObserver.created]
    }

    static reset(): void {
        MockResizeObserver.created.length = 0
    }

    /** Replaces the global `ResizeObserver` constructor. */
    static install(): void {
        MockResizeObserver.globals.install('ResizeObserver', MockResizeObserver)
    }

    static uninstall(): void {
        MockResizeObserver.globals.uninstall()
    }

    observe(target: Element): void {
        this.targets.add(target)
    }

    unobserve(target: Element): void {
        this.targets.delete(target)
    }

    disconnect(): void {
        this.targets.clear()
    }

    observed(): readonly Element[] {
        return [...this.targets]
    }

    trigger(entries: readonly ResizeEntryInit[]): void {
        this.callback(entries.map((entry) => this.toEntry(entry)), this)
    }

    private toEntry({ target, width, height }: ResizeEntryInit): ResizeObserverEntry {
        const size: ResizeObserverSize = { inlineSize: width, blockSize: height }
        return {
            target,
            contentRect: emptyRect(width, height),
            contentBoxSize: [size],
            borderBoxSize: [size],
            devicePixelContentBoxSize: [size],
        }
    }
}
