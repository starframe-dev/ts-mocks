import { afterEach, describe, expect, it } from 'vitest'
import { MockEventSource } from './eventsource.js'

afterEach(() => {
    MockEventSource.reset()
    MockEventSource.uninstall()
})

describe('MockEventSource', () => {
    it('satisfies the DOM EventSource type', () => {
        const source = new MockEventSource('https://example.com/stream') satisfies EventSource
        expect(source.readyState).toBe(MockEventSource.CONNECTING)
    })

    it('normalises the URL and reads init options', () => {
        const source = new MockEventSource('https://example.com', { withCredentials: true })

        expect(source.url).toBe('https://example.com/')
        expect(source.withCredentials).toBe(true)
        expect(new MockEventSource('https://example.com').withCredentials).toBe(false)
    })

    it('tracks created instances', () => {
        const source = new MockEventSource('https://example.com/')

        expect(MockEventSource.instances()).toEqual([source])
        expect(MockEventSource.last()).toBe(source)
        MockEventSource.reset()
        expect(MockEventSource.last()).toBeUndefined()
    })

    it('opens and delivers default and named events', () => {
        const source = new MockEventSource('https://example.com/stream')
        const seen: string[] = []
        source.onopen = () => seen.push('open')
        source.onmessage = (event) => seen.push(`message:${String(event.data)}`)
        source.addEventListener('update', (event) => {
            const message = event as MessageEvent
            seen.push(`update:${String(message.data)}:${message.lastEventId}:${message.origin}`)
        })

        source.open()
        source.emit('hello')
        source.emit('{"v":1}', 'update', '42')

        expect(source.readyState).toBe(MockEventSource.OPEN)
        expect(seen).toEqual(['open', 'message:hello', 'update:{"v":1}:42:https://example.com'])
    })

    it('removeEventListener stops delivery', () => {
        const source = new MockEventSource('https://example.com/')
        let calls = 0
        const listener = (): void => {
            calls++
        }
        source.addEventListener('message', listener)
        source.open()

        source.emit('a')
        source.removeEventListener('message', listener)
        source.emit('b')

        expect(calls).toBe(1)
    })

    it('does not call onmessage for named events', () => {
        const source = new MockEventSource('https://example.com/')
        let calls = 0
        source.onmessage = () => calls++
        source.open()

        source.emit('x', 'custom')

        expect(calls).toBe(0)
    })

    it('error reconnects by default and closes when fatal', () => {
        const source = new MockEventSource('https://example.com/')
        let errors = 0
        source.onerror = () => errors++
        source.open()

        source.error()
        expect(source.readyState).toBe(MockEventSource.CONNECTING)
        source.error(true)
        expect(source.readyState).toBe(MockEventSource.CLOSED)
        source.error()

        expect(errors).toBe(2)
    })

    it('close stops the connection and is recorded', () => {
        const source = new MockEventSource('https://example.com/')
        source.open()
        source.close()

        expect(source.readyState).toBe(MockEventSource.CLOSED)
        expect(source.history().map((call) => call.args)).toEqual([['close']])
    })

    it('validates the state for test controls', () => {
        const source = new MockEventSource('https://example.com/')

        expect(() => source.emit('x')).toThrow(/not open/)
        source.open()
        expect(() => source.open()).toThrow(/not connecting/)
    })

    it('installs as the global EventSource and restores it', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'EventSource')

        MockEventSource.install()
        expect(Reflect.get(globalThis, 'EventSource')).toBe(MockEventSource)
        MockEventSource.uninstall()

        expect(Object.getOwnPropertyDescriptor(globalThis, 'EventSource')).toEqual(before)
    })
})
