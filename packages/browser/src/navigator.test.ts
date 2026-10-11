import { describe, expect, it } from 'vitest'
import { MockClipboard } from './clipboard.js'
import { patch } from './internal/global.js'
import { MockNavigator } from './navigator.js'

describe('MockClipboard', () => {
    it('reads and writes text', async () => {
        const clipboard = new MockClipboard('start')

        expect(await clipboard.readText()).toBe('start')
        await clipboard.writeText('next')
        expect(await clipboard.readText()).toBe('next')
        expect(clipboard.content).toBe('next')
    })

    it('records the history of calls', async () => {
        const clipboard = new MockClipboard()
        await clipboard.writeText('x')
        await clipboard.readText()

        expect(clipboard.history().map((call) => call.args)).toEqual([['writeText', 'x'], ['readText']])
        clipboard.clearHistory()
        expect(clipboard.history()).toEqual([])
    })

    it('installs onto the existing navigator and restores it', () => {
        const clipboard = new MockClipboard()
        const before = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

        clipboard.install()
        expect(Reflect.get(navigator, 'clipboard')).toBe(clipboard)
        clipboard.uninstall()

        expect(Object.getOwnPropertyDescriptor(navigator, 'clipboard')).toEqual(before)
    })

    it('refuses to install without a navigator', () => {
        const restore = patch(globalThis, 'navigator', undefined)
        try {
            expect(() => new MockClipboard().install()).toThrow(/MockNavigator/)
        } finally {
            restore()
        }
    })
})

describe('MockNavigator', () => {
    it('has sensible defaults', () => {
        const navigator = new MockNavigator()

        expect(navigator.onLine).toBe(true)
        expect(navigator.language).toBe('en-US')
        expect(navigator.languages).toEqual(['en-US'])
        expect(navigator.userAgent).toBe('ts-mocks')
        expect(navigator.clipboard).toBeInstanceOf(MockClipboard)
    })

    it('uses the init values', () => {
        const clipboard = new MockClipboard()
        const navigator = new MockNavigator({
            onLine: false,
            language: 'ru-RU',
            languages: ['ru-RU', 'en'],
            userAgent: 'test-agent',
            clipboard,
        })

        expect(navigator.onLine).toBe(false)
        expect(navigator.languages).toEqual(['ru-RU', 'en'])
        expect(navigator.userAgent).toBe('test-agent')
        expect(navigator.clipboard).toBe(clipboard)
    })

    it('fires online and offline events on itself and the window target', () => {
        const windowTarget = new EventTarget()
        const navigator = new MockNavigator({ windowTarget })
        const own: string[] = []
        const onWindow: string[] = []
        for (const type of ['online', 'offline']) {
            navigator.addEventListener(type, (event) => own.push(event.type))
            windowTarget.addEventListener(type, (event) => onWindow.push(event.type))
        }

        navigator.setOnLine(false)
        navigator.setOnLine(false)
        navigator.setOnLine(true)

        expect(navigator.onLine).toBe(true)
        expect(own).toEqual(['offline', 'online'])
        expect(onWindow).toEqual(['offline', 'online'])
    })

    it('works without a window target', () => {
        const navigator = new MockNavigator()

        expect(() => navigator.setOnLine(false)).not.toThrow()
    })

    it('installs as the global navigator and restores it', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
        const mock = new MockNavigator()

        mock.install()
        expect(Reflect.get(globalThis, 'navigator')).toBe(mock)
        mock.uninstall()

        expect(Object.getOwnPropertyDescriptor(globalThis, 'navigator')).toEqual(before)
    })
})
