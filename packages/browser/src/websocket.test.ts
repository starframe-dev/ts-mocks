import { afterEach, describe, expect, it } from 'vitest'
import { MockWebSocket } from './websocket.js'
import type { MockCloseEvent } from './websocket.js'

afterEach(() => {
    MockWebSocket.reset()
    MockWebSocket.uninstall()
})

function recordEvents(socket: MockWebSocket): string[] {
    const events: string[] = []
    for (const type of ['open', 'message', 'error', 'close']) {
        socket.addEventListener(type, (event) => events.push(event instanceof MessageEvent ? `message:${String(event.data)}` : event.type))
    }
    return events
}

describe('MockWebSocket', () => {
    it('satisfies the DOM WebSocket type', () => {
        const socket = new MockWebSocket('ws://localhost/') satisfies WebSocket
        expect(socket.readyState).toBe(MockWebSocket.CONNECTING)
    })

    it('normalises the URL and keeps the requested protocols', () => {
        const single = new MockWebSocket('ws://example.com', 'chat')
        const several = new MockWebSocket(new URL('wss://example.com/x'), ['a', 'b'])

        expect(single.url).toBe('ws://example.com/')
        expect(single.requestedProtocols).toEqual(['chat'])
        expect(several.requestedProtocols).toEqual(['a', 'b'])
    })

    it('rejects invalid URLs', () => {
        expect(() => new MockWebSocket('not a url')).toThrow(DOMException)
    })

    it('tracks created instances', () => {
        const first = new MockWebSocket('ws://a/')
        const second = new MockWebSocket('ws://b/')

        expect(MockWebSocket.instances()).toEqual([first, second])
        expect(MockWebSocket.last()).toBe(second)
        MockWebSocket.reset()
        expect(MockWebSocket.instances()).toEqual([])
        expect(MockWebSocket.last()).toBeUndefined()
    })

    it('cannot send while connecting', () => {
        const socket = new MockWebSocket('ws://a/')

        expect(() => socket.send('x')).toThrow(/CONNECTING/)
        expect(socket.sent()).toEqual([])
    })

    it('opens, exchanges messages and closes from the server', () => {
        const socket = new MockWebSocket('ws://a/')
        const events = recordEvents(socket)
        const handled: string[] = []
        socket.onopen = () => handled.push('open')
        socket.onmessage = (event) => handled.push(String(event.data))
        socket.onclose = (event) => handled.push(`close:${event.code}`)

        socket.open('chat')
        socket.send('ping')
        socket.send(new Uint8Array([1]))
        socket.receive('pong')
        socket.serverClose(4000, 'bye')

        expect(socket.readyState).toBe(MockWebSocket.CLOSED)
        expect(socket.protocol).toBe('chat')
        expect(socket.sent()).toEqual(['ping', new Uint8Array([1])])
        expect(events).toEqual(['open', 'message:pong', 'close'])
        expect(handled).toEqual(['open', 'pong', 'close:4000'])
    })

    it('close events describe the closure', () => {
        const socket = new MockWebSocket('ws://a/')
        let closeEvent: MockCloseEvent | undefined
        socket.onclose = (event) => (closeEvent = event)
        socket.open()

        socket.serverClose()

        expect(closeEvent).toMatchObject({ code: 1000, reason: '', wasClean: true })
    })

    it('client close completes immediately; default code is 1005', () => {
        const socket = new MockWebSocket('ws://a/')
        const codes: number[] = []
        socket.onclose = (event) => codes.push(event.code)
        socket.open()

        socket.close()
        socket.close()

        expect(socket.readyState).toBe(MockWebSocket.CLOSED)
        expect(codes).toEqual([1005])
    })

    it('client close accepts 1000 and 3000-4999 and rejects other codes', () => {
        const ok = new MockWebSocket('ws://a/')
        ok.open()
        ok.close(3001, 'custom')
        const normal = new MockWebSocket('ws://a/')
        normal.open()
        normal.close(1000)

        expect(() => new MockWebSocket('ws://a/').close(1001)).toThrow(/close code/)
        expect(() => new MockWebSocket('ws://a/').close(5000)).toThrow(DOMException)
    })

    it('drops messages sent after closing', () => {
        const socket = new MockWebSocket('ws://a/')
        socket.open()
        socket.close()
        socket.send('late')

        expect(socket.sent()).toEqual([])
    })

    it('error fires error then an abnormal close', () => {
        const socket = new MockWebSocket('ws://a/')
        const events = recordEvents(socket)
        const codes: number[] = []
        socket.onclose = (event) => codes.push(event.code)
        socket.onerror = () => codes.push(-1)

        socket.error()
        socket.error()

        expect(events).toEqual(['error', 'close'])
        expect(codes).toEqual([-1, 1006])
        expect(socket.readyState).toBe(MockWebSocket.CLOSED)
    })

    it('validates the state for test controls', () => {
        const socket = new MockWebSocket('ws://a/')

        expect(() => socket.receive('x')).toThrow(/not open/)
        socket.open()
        expect(() => socket.open()).toThrow(/not connecting/)
        socket.serverClose()
        expect(() => socket.serverClose()).not.toThrow()
    })

    it('records the history of calls', () => {
        const socket = new MockWebSocket('ws://a/')
        socket.open()
        socket.send('x')
        socket.close(1000, 'done')

        expect(socket.history().map((call) => call.args)).toEqual([['send', 'x'], ['close', 1000, 'done']])
    })

    it('installs as the global WebSocket and restores it', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket')

        MockWebSocket.install()
        expect(Reflect.get(globalThis, 'WebSocket')).toBe(MockWebSocket)
        MockWebSocket.uninstall()

        expect(Object.getOwnPropertyDescriptor(globalThis, 'WebSocket')).toEqual(before)
    })
})
