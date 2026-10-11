import { describe, expect, it } from 'vitest'
import { MockMatchMedia, MockMediaQueryList } from './media.js'
import type { MockMediaQueryListEvent } from './media.js'

describe('MockMediaQueryList', () => {
    it('satisfies the DOM MediaQueryList type', () => {
        const list = new MockMediaQueryList('(min-width: 1px)', true) satisfies MediaQueryList
        expect(list.matches).toBe(true)
    })
})

describe('MockMatchMedia', () => {
    it('does not match unknown queries', () => {
        const media = new MockMatchMedia()

        expect(media.matchMedia('(prefers-color-scheme: dark)')).toMatchObject({
            media: '(prefers-color-scheme: dark)',
            matches: false,
        })
    })

    it('uses a result that was set before the list was created', () => {
        const media = new MockMatchMedia()
        media.setMatches('(min-width: 600px)', true)

        expect(media.matchMedia('(min-width: 600px)').matches).toBe(true)
    })

    it('notifies lists of the same query when the result changes', () => {
        const media = new MockMatchMedia()
        const dark = media.matchMedia('(dark)')
        const other = media.matchMedia('(wide)')
        const seen: string[] = []
        dark.onchange = (event) => seen.push(`onchange:${event.matches}`)
        dark.addEventListener('change', (event) => {
            const change = event as MockMediaQueryListEvent
            seen.push(`listener:${change.media}:${change.matches}`)
        })
        dark.addListener(() => seen.push('legacy'))

        media.setMatches('(dark)', true)

        expect(dark.matches).toBe(true)
        expect(other.matches).toBe(false)
        expect(seen).toEqual(['onchange:true', 'listener:(dark):true', 'legacy'])
    })

    it('does not notify when the result is unchanged and supports removeListener', () => {
        const media = new MockMatchMedia()
        const list = media.matchMedia('(q)')
        let calls = 0
        const listener = (): void => {
            calls++
        }
        list.addListener(listener)

        media.setMatches('(q)', false)
        media.setMatches('(q)', true)
        list.removeListener(listener)
        media.setMatches('(q)', false)

        expect(calls).toBe(1)
    })

    it('records the history of calls', () => {
        const media = new MockMatchMedia()
        media.matchMedia('(a)')
        media.matchMedia('(b)')

        expect(media.history().map((call) => call.args)).toEqual([['matchMedia', '(a)'], ['matchMedia', '(b)']])
        media.clearHistory()
        expect(media.history()).toEqual([])
    })

    it('installs as global matchMedia and restores it', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia')
        const media = new MockMatchMedia()

        media.install()
        expect(Reflect.get(globalThis, 'matchMedia')).toBe(media.matchMedia)
        media.uninstall()

        expect(Object.getOwnPropertyDescriptor(globalThis, 'matchMedia')).toEqual(before)
    })
})
