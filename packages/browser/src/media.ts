import { emit } from './internal/events.js'
import type { EventHandler } from './internal/events.js'
import { GlobalInstaller } from './internal/global.js'
import { MethodLog } from './internal/log.js'
import type { MethodHistory } from './internal/log.js'

export class MockMediaQueryListEvent extends Event {
    constructor(
        readonly media: string,
        readonly matches: boolean,
    ) {
        super('change')
    }
}

export class MockMediaQueryList extends EventTarget {
    onchange: EventHandler<MockMediaQueryListEvent> = null
    private current: boolean

    constructor(
        readonly media: string,
        matches: boolean,
    ) {
        super()
        this.current = matches
    }

    get matches(): boolean {
        return this.current
    }

    /** Deprecated alias of `addEventListener('change', …)`. */
    addListener(listener: ((event: MockMediaQueryListEvent) => unknown) | null): void {
        this.addEventListener('change', listener as EventListener | null)
    }

    removeListener(listener: ((event: MockMediaQueryListEvent) => unknown) | null): void {
        this.removeEventListener('change', listener as EventListener | null)
    }

    /** Changes the result and notifies listeners when it differs. */
    setMatches(matches: boolean): void {
        if (matches === this.current) return
        this.current = matches
        emit(this, new MockMediaQueryListEvent(this.media, matches), this.onchange)
    }
}

/** `window.matchMedia` whose results are set by the test. Unknown queries do not match. */
export class MockMatchMedia {
    private readonly results = new Map<string, boolean>()
    private readonly lists: MockMediaQueryList[] = []
    private readonly log = new MethodLog()
    private readonly globals = new GlobalInstaller()

    readonly matchMedia = (query: string): MockMediaQueryList => {
        this.log.record('matchMedia', query)
        const list = new MockMediaQueryList(query, this.results.get(query) ?? false)
        this.lists.push(list)
        return list
    }

    /** Sets the result for an exact query string and notifies the lists created for it. */
    setMatches(query: string, matches: boolean): void {
        this.results.set(query, matches)
        for (const list of this.lists) {
            if (list.media === query) list.setMatches(matches)
        }
    }

    history(): MethodHistory {
        return this.log.history()
    }

    clearHistory(): void {
        this.log.clear()
    }

    install(): void {
        this.globals.install('matchMedia', this.matchMedia)
    }

    uninstall(): void {
        this.globals.uninstall()
    }
}
