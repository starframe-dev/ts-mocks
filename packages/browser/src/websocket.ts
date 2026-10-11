import { emit } from './internal/events.js'
import type { EventHandler } from './internal/events.js'
import { GlobalInstaller } from './internal/global.js'
import { MethodLog } from './internal/log.js'
import type { MethodHistory } from './internal/log.js'

export type SendData = string | ArrayBufferLike | Blob | ArrayBufferView

const CONNECTING = 0
const OPEN = 1
const CLOSING = 2
const CLOSED = 3

const CODE_NO_STATUS = 1005
const CODE_NORMAL = 1000
const CODE_ABNORMAL = 1006
const CUSTOM_CODE_MIN = 3000
const CUSTOM_CODE_MAX = 4999

export class MockCloseEvent extends Event {
    constructor(
        readonly code: number,
        readonly reason: string,
        readonly wasClean: boolean,
    ) {
        super('close')
    }
}

function parseUrl(url: string | URL): string {
    try {
        return new URL(url).href
    } catch {
        throw new DOMException(`The URL '${String(url)}' is invalid.`, 'SyntaxError')
    }
}

/**
 * WebSocket whose server side is driven by the test: `open()`, `receive()`, `serverClose()`, `error()`.
 * Events are dispatched synchronously.
 */
export class MockWebSocket extends EventTarget {
    static readonly CONNECTING = CONNECTING
    static readonly OPEN = OPEN
    static readonly CLOSING = CLOSING
    static readonly CLOSED = CLOSED

    private static readonly created: MockWebSocket[] = []
    private static readonly globals = new GlobalInstaller()

    readonly CONNECTING = CONNECTING
    readonly OPEN = OPEN
    readonly CLOSING = CLOSING
    readonly CLOSED = CLOSED

    readonly url: string
    readonly requestedProtocols: readonly string[]
    readyState: number = CONNECTING
    protocol = ''
    extensions = ''
    bufferedAmount = 0
    binaryType: BinaryType = 'blob'
    onopen: EventHandler<Event> = null
    onmessage: EventHandler<MessageEvent> = null
    onerror: EventHandler<Event> = null
    onclose: EventHandler<MockCloseEvent> = null
    private readonly log = new MethodLog()
    private readonly outbox: SendData[] = []

    constructor(url: string | URL, protocols: string | readonly string[] = []) {
        super()
        this.url = parseUrl(url)
        this.requestedProtocols = typeof protocols === 'string' ? [protocols] : [...protocols]
        MockWebSocket.created.push(this)
    }

    /** All sockets created since the last `reset()`. */
    static instances(): readonly MockWebSocket[] {
        return [...MockWebSocket.created]
    }

    static last(): MockWebSocket | undefined {
        return MockWebSocket.created.at(-1)
    }

    static reset(): void {
        MockWebSocket.created.length = 0
    }

    /** Replaces the global `WebSocket` constructor. */
    static install(): void {
        MockWebSocket.globals.install('WebSocket', MockWebSocket)
    }

    static uninstall(): void {
        MockWebSocket.globals.uninstall()
    }

    // ---- client API ----

    send(data: SendData): void {
        this.log.record('send', data)
        if (this.readyState === CONNECTING) {
            throw new DOMException('Still in CONNECTING state.', 'InvalidStateError')
        }
        if (this.readyState === OPEN) this.outbox.push(data)
    }

    close(code?: number, reason = ''): void {
        this.log.record('close', code, reason)
        if (code !== undefined && code !== CODE_NORMAL && (code < CUSTOM_CODE_MIN || code > CUSTOM_CODE_MAX)) {
            throw new DOMException(`The close code must be ${CODE_NORMAL} or in the range 3000-4999.`, 'InvalidAccessError')
        }
        if (this.readyState === CLOSING || this.readyState === CLOSED) return
        this.finishClose(code ?? CODE_NO_STATUS, reason, true)
    }

    // ---- test controls (the server side) ----

    /** Completes the handshake. */
    open(protocol = ''): void {
        if (this.readyState !== CONNECTING) {
            throw new DOMException('The socket is not connecting.', 'InvalidStateError')
        }
        this.readyState = OPEN
        this.protocol = protocol
        emit(this, new Event('open'), this.onopen)
    }

    /** Delivers a message from the server. */
    receive(data: string | ArrayBuffer | Blob): void {
        if (this.readyState !== OPEN) {
            throw new DOMException('The socket is not open.', 'InvalidStateError')
        }
        emit(this, new MessageEvent('message', { data }), this.onmessage)
    }

    /** Closes the connection from the server side. */
    serverClose(code = CODE_NORMAL, reason = ''): void {
        if (this.readyState === CLOSED) return
        this.finishClose(code, reason, true)
    }

    /** Fails the connection: fires `error`, then `close` with code 1006. */
    error(): void {
        if (this.readyState === CLOSED) return
        emit(this, new Event('error'), this.onerror)
        this.finishClose(CODE_ABNORMAL, '', false)
    }

    /** Messages passed to `send()` while the socket was open. */
    sent(): readonly SendData[] {
        return [...this.outbox]
    }

    history(): MethodHistory {
        return this.log.history()
    }

    private finishClose(code: number, reason: string, wasClean: boolean): void {
        this.readyState = CLOSED
        emit(this, new MockCloseEvent(code, reason, wasClean), this.onclose)
    }
}
