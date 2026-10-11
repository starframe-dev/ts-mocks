import { emit } from './internal/events.js'
import type { EventHandler } from './internal/events.js'
import { GlobalInstaller } from './internal/global.js'
import { MethodLog } from './internal/log.js'
import type { MethodHistory } from './internal/log.js'

const CONNECTING = 0
const OPEN = 1
const CLOSED = 2

/** EventSource whose server side is driven by the test: `open()`, `emit()`, `error()`. */
export class MockEventSource extends EventTarget {
    static readonly CONNECTING = CONNECTING
    static readonly OPEN = OPEN
    static readonly CLOSED = CLOSED

    private static readonly created: MockEventSource[] = []
    private static readonly globals = new GlobalInstaller()

    readonly CONNECTING = CONNECTING
    readonly OPEN = OPEN
    readonly CLOSED = CLOSED

    readonly url: string
    readonly withCredentials: boolean
    readyState: number = CONNECTING
    onopen: EventHandler<Event> = null
    onmessage: EventHandler<MessageEvent> = null
    onerror: EventHandler<Event> = null
    private readonly log = new MethodLog()

    constructor(url: string | URL, init: EventSourceInit = {}) {
        super()
        this.url = new URL(url).href
        this.withCredentials = init.withCredentials ?? false
        MockEventSource.created.push(this)
    }

    static instances(): readonly MockEventSource[] {
        return [...MockEventSource.created]
    }

    static last(): MockEventSource | undefined {
        return MockEventSource.created.at(-1)
    }

    static reset(): void {
        MockEventSource.created.length = 0
    }

    /** Replaces the global `EventSource` constructor. */
    static install(): void {
        MockEventSource.globals.install('EventSource', MockEventSource)
    }

    static uninstall(): void {
        MockEventSource.globals.uninstall()
    }

    /** Listeners for server events receive a `MessageEvent`, as in browsers. */
    override addEventListener(
        type: string,
        listener: (event: MessageEvent) => unknown,
        options?: boolean | AddEventListenerOptions,
    ): void
    override addEventListener(
        type: string,
        // Separate overloads keep the contextual type of inline listeners (as in the DOM typings).
        // eslint-disable-next-line @typescript-eslint/unified-signatures
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ): void
    override addEventListener(
        type: string,
        listener: ((event: MessageEvent) => unknown) | EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, listener as EventListenerOrEventListenerObject | null, options)
    }

    override removeEventListener(
        type: string,
        listener: (event: MessageEvent) => unknown,
        options?: boolean | EventListenerOptions,
    ): void
    override removeEventListener(
        type: string,
        // eslint-disable-next-line @typescript-eslint/unified-signatures
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
    ): void
    override removeEventListener(
        type: string,
        listener: ((event: MessageEvent) => unknown) | EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
    ): void {
        super.removeEventListener(type, listener as EventListenerOrEventListenerObject | null, options)
    }

    close(): void {
        this.log.record('close')
        this.readyState = CLOSED
    }

    // ---- test controls (the server side) ----

    /** Completes the connection. */
    open(): void {
        if (this.readyState !== CONNECTING) {
            throw new DOMException('The connection is not connecting.', 'InvalidStateError')
        }
        this.readyState = OPEN
        emit(this, new Event('open'), this.onopen)
    }

    /** Sends a server event; `type` defaults to the standard `message` event. */
    emit(data: string, type = 'message', lastEventId = ''): void {
        if (this.readyState !== OPEN) {
            throw new DOMException('The connection is not open.', 'InvalidStateError')
        }
        const event = new MessageEvent(type, { data, lastEventId, origin: new URL(this.url).origin })
        emit(this, event, type === 'message' ? this.onmessage : null)
    }

    /** Fires `error`. A fatal error closes the connection; otherwise it goes back to CONNECTING (reconnect). */
    error(fatal = false): void {
        if (this.readyState === CLOSED) return
        this.readyState = fatal ? CLOSED : CONNECTING
        emit(this, new Event('error'), this.onerror)
    }

    history(): MethodHistory {
        return this.log.history()
    }
}
