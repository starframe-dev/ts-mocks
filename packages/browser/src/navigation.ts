import { GlobalInstaller } from './internal/global.js'
import { MethodLog } from './internal/log.js'
import type { MethodHistory } from './internal/log.js'

const DEFAULT_URL = 'http://localhost/'

interface Entry {
    readonly url: URL
    readonly state: unknown
}

export class MockPopStateEvent extends Event {
    constructor(readonly state: unknown) {
        super('popstate')
    }
}

/**
 * Session history. Events are dispatched synchronously (browsers do it asynchronously).
 * `MockLocation` reads and changes the current entry of the history it was created from.
 */
export class MockHistory extends EventTarget {
    readonly location: MockLocation
    scrollRestoration: ScrollRestoration = 'auto'
    private current: Entry
    private readonly before: Entry[] = []
    private readonly after: Entry[] = []
    private readonly log = new MethodLog()
    private readonly globals = new GlobalInstaller()

    constructor(initialUrl: string | URL = DEFAULT_URL) {
        super()
        this.current = { url: new URL(initialUrl), state: null }
        this.location = new MockLocation(this)
    }

    get length(): number {
        return this.before.length + 1 + this.after.length
    }

    get state(): unknown {
        return this.current.state
    }

    /** A copy of the current URL. */
    get url(): URL {
        return new URL(this.current.url)
    }

    pushState(state: unknown, _unused: string, url?: string | URL | null): void {
        this.log.record('pushState', state, url)
        const next = this.resolveSameOrigin(url)
        this.before.push(this.current)
        this.after.length = 0
        this.current = { url: next, state }
    }

    replaceState(state: unknown, _unused: string, url?: string | URL | null): void {
        this.log.record('replaceState', state, url)
        this.current = { url: this.resolveSameOrigin(url), state }
    }

    back(): void {
        this.go(-1)
    }

    forward(): void {
        this.go(1)
    }

    /** Moves through the history and fires `popstate`. Out-of-range moves do nothing. */
    go(delta = 0): void {
        this.log.record('go', delta)
        const forward = delta > 0
        const steps = Math.abs(delta)
        if (steps === 0 || steps > (forward ? this.after.length : this.before.length)) return
        for (let step = 0; step < steps; step++) {
            if (forward) {
                this.before.push(this.current)
                this.current = this.after.shift() ?? this.current
            } else {
                this.after.unshift(this.current)
                this.current = this.before.pop() ?? this.current
            }
        }
        this.dispatchEvent(new MockPopStateEvent(this.current.state))
    }

    /** Simulates a full navigation (any origin): adds or replaces an entry and resets the state. */
    navigate(url: string | URL, replace = false): void {
        this.log.record('navigate', String(url), replace)
        const next = new URL(url, this.current.url)
        if (replace) {
            this.current = { url: next, state: null }
            return
        }
        this.before.push(this.current)
        this.after.length = 0
        this.current = { url: next, state: null }
    }

    history(): MethodHistory {
        return this.log.history()
    }

    clearHistory(): void {
        this.log.clear()
    }

    install(): void {
        this.globals.install('history', this)
    }

    uninstall(): void {
        this.globals.uninstall()
    }

    private resolveSameOrigin(url: string | URL | null | undefined): URL {
        if (url === undefined || url === null) return this.current.url
        const resolved = new URL(url, this.current.url)
        if (resolved.origin !== this.current.url.origin) {
            throw new DOMException(`Cannot change the URL to ${resolved.href} from ${this.current.url.href}`, 'SecurityError')
        }
        return resolved
    }
}

/** `window.location` over a `MockHistory`. Navigation methods add history entries. */
export class MockLocation {
    private readonly log = new MethodLog()
    private readonly globals = new GlobalInstaller()

    constructor(private readonly navigation: MockHistory) {}

    get href(): string {
        return this.navigation.url.href
    }

    set href(value: string) {
        this.assign(value)
    }

    get origin(): string {
        return this.navigation.url.origin
    }

    get protocol(): string {
        return this.navigation.url.protocol
    }

    get host(): string {
        return this.navigation.url.host
    }

    get hostname(): string {
        return this.navigation.url.hostname
    }

    get port(): string {
        return this.navigation.url.port
    }

    get pathname(): string {
        return this.navigation.url.pathname
    }

    get search(): string {
        return this.navigation.url.search
    }

    get hash(): string {
        return this.navigation.url.hash
    }

    set hash(value: string) {
        const next = this.navigation.url
        next.hash = value
        this.assign(next)
    }

    assign(url: string | URL): void {
        this.log.record('assign', String(url))
        this.navigation.navigate(url)
    }

    replace(url: string | URL): void {
        this.log.record('replace', String(url))
        this.navigation.navigate(url, true)
    }

    reload(): void {
        this.log.record('reload')
    }

    toString(): string {
        return this.href
    }

    history(): MethodHistory {
        return this.log.history()
    }

    clearHistory(): void {
        this.log.clear()
    }

    install(): void {
        this.globals.install('location', this)
    }

    uninstall(): void {
        this.globals.uninstall()
    }
}
