import { describe, expect, it } from 'vitest'
import { MockHistory } from './navigation.js'
import type { MockPopStateEvent } from './navigation.js'

function popStates(history: MockHistory): unknown[] {
    const states: unknown[] = []
    history.addEventListener('popstate', (event) => states.push((event as MockPopStateEvent).state))
    return states
}

describe('MockHistory', () => {
    it('satisfies the DOM History type', () => {
        const history = new MockHistory() satisfies History
        expect(history.length).toBe(1)
    })

    it('starts at the given URL with null state', () => {
        const history = new MockHistory('https://example.com:8080/a/b?x=1#h')

        expect(history.state).toBeNull()
        expect(history.url.href).toBe('https://example.com:8080/a/b?x=1#h')
        expect(new MockHistory().url.href).toBe('http://localhost/')
    })

    it('pushState adds entries, resolves relative URLs and keeps the URL when none is given', () => {
        const history = new MockHistory('https://example.com/a/')
        history.pushState({ n: 1 }, '', 'b')
        history.pushState({ n: 2 }, '')

        expect(history.length).toBe(3)
        expect(history.state).toEqual({ n: 2 })
        expect(history.url.pathname).toBe('/a/b')
    })

    it('replaceState replaces the current entry', () => {
        const history = new MockHistory('https://example.com/')
        history.replaceState('s', '', '/new')

        expect(history.length).toBe(1)
        expect(history.state).toBe('s')
        expect(history.url.pathname).toBe('/new')
    })

    it('rejects cross-origin URLs without changing anything', () => {
        const history = new MockHistory('https://example.com/')

        expect(() => history.pushState(null, '', 'https://evil.test/')).toThrow(DOMException)
        expect(() => history.replaceState(null, '', 'https://evil.test/')).toThrow(/Cannot change the URL/)
        expect(history.length).toBe(1)
    })

    it('back, forward and go fire popstate with the entry state', () => {
        const history = new MockHistory('https://example.com/')
        history.pushState('one', '', '/1')
        history.pushState('two', '', '/2')
        const states = popStates(history)

        history.back()
        history.back()
        history.forward()
        history.go(1)
        history.go(-3)

        expect(states).toEqual(['one', null, 'one', 'two'])
        expect(history.url.pathname).toBe('/2')
    })

    it('ignores out-of-range moves and go(0)', () => {
        const history = new MockHistory()
        const states = popStates(history)

        history.back()
        history.forward()
        history.go()

        expect(states).toEqual([])
    })

    it('pushing after going back drops the forward entries', () => {
        const history = new MockHistory('https://example.com/')
        history.pushState(null, '', '/1')
        history.back()
        history.pushState(null, '', '/other')
        history.forward()

        expect(history.length).toBe(2)
        expect(history.url.pathname).toBe('/other')
    })

    it('records the history of calls', () => {
        const history = new MockHistory()
        history.pushState('s', '', '/x')
        history.replaceState('t', '', '/y')
        history.go(-1)

        expect(history.history().map((call) => call.args[0])).toEqual(['pushState', 'replaceState', 'go'])
        history.clearHistory()
        expect(history.history()).toEqual([])
    })

    it('installs as global history and restores it', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'history')
        const history = new MockHistory()

        history.install()
        expect(Reflect.get(globalThis, 'history')).toBe(history)
        history.uninstall()

        expect(Object.getOwnPropertyDescriptor(globalThis, 'history')).toEqual(before)
    })
})

describe('MockLocation', () => {
    it('exposes the URL parts', () => {
        const { location } = new MockHistory('https://user@example.com:8080/a/b?x=1#h')

        expect(location.href).toBe('https://user@example.com:8080/a/b?x=1#h')
        expect(location.origin).toBe('https://example.com:8080')
        expect(location.protocol).toBe('https:')
        expect(location.host).toBe('example.com:8080')
        expect(location.hostname).toBe('example.com')
        expect(location.port).toBe('8080')
        expect(location.pathname).toBe('/a/b')
        expect(location.search).toBe('?x=1')
        expect(location.hash).toBe('#h')
        expect(String(location)).toBe(location.href)
    })

    it('follows the history', () => {
        const history = new MockHistory('https://example.com/')
        history.pushState(null, '', '/page?q=1')

        expect(history.location.pathname).toBe('/page')
        expect(history.location.search).toBe('?q=1')
    })

    it('assign and href setter add entries, replace does not', () => {
        const history = new MockHistory('https://example.com/')
        const { location } = history
        location.assign('/a')
        location.href = 'https://other.test/b'
        location.replace('/c')

        expect(history.length).toBe(3)
        expect(location.href).toBe('https://other.test/c')
        expect(history.state).toBeNull()
    })

    it('hash setter navigates to the new hash', () => {
        const history = new MockHistory('https://example.com/page')
        history.location.hash = '#section'

        expect(history.location.href).toBe('https://example.com/page#section')
        expect(history.length).toBe(2)
    })

    it('records the history of calls', () => {
        const { location } = new MockHistory()
        location.assign('/a')
        location.replace('/b')
        location.reload()

        expect(location.history().map((call) => call.args)).toEqual([['assign', '/a'], ['replace', '/b'], ['reload']])
        location.clearHistory()
        expect(location.history()).toEqual([])
    })

    it('installs as global location and restores it', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'location')
        const { location } = new MockHistory()

        location.install()
        expect(Reflect.get(globalThis, 'location')).toBe(location)
        location.uninstall()

        expect(Object.getOwnPropertyDescriptor(globalThis, 'location')).toEqual(before)
    })
})
