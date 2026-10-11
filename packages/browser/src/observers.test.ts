import { afterEach, describe, expect, it } from 'vitest'
import { MockIntersectionObserver, MockResizeObserver } from './observers.js'

const element = (id: string): Element => ({ id }) as unknown as Element

afterEach(() => {
    MockIntersectionObserver.reset()
    MockIntersectionObserver.uninstall()
    MockResizeObserver.reset()
    MockResizeObserver.uninstall()
})

describe('MockIntersectionObserver', () => {
    it('satisfies the DOM IntersectionObserver type', () => {
        const observer = new MockIntersectionObserver(() => undefined) satisfies IntersectionObserver
        expect(observer.thresholds).toEqual([0])
    })

    it('reads options', () => {
        const root = element('root')
        const observer = new MockIntersectionObserver(() => undefined, { root, rootMargin: '10px', threshold: [0, 0.5] })

        expect(observer.root).toBe(root)
        expect(observer.rootMargin).toBe('10px')
        expect(observer.thresholds).toEqual([0, 0.5])
        expect(new MockIntersectionObserver(() => undefined, { threshold: 0.25 }).thresholds).toEqual([0.25])
        expect(new MockIntersectionObserver(() => undefined).rootMargin).toBe('0px')
    })

    it('tracks observed elements', () => {
        const observer = new MockIntersectionObserver(() => undefined)
        const a = element('a')
        const b = element('b')
        observer.observe(a)
        observer.observe(b)
        observer.unobserve(a)

        expect(observer.observed()).toEqual([b])
        observer.disconnect()
        expect(observer.observed()).toEqual([])
        expect(observer.takeRecords()).toEqual([])
    })

    it('trigger calls the callback with complete entries and the observer', () => {
        const received: { entries: IntersectionObserverEntry[]; observer: IntersectionObserver }[] = []
        const observer = new MockIntersectionObserver((entries, source) => received.push({ entries, observer: source }))
        const target = element('t')

        observer.trigger([{ target, isIntersecting: true }, { target, intersectionRatio: 0.3, time: 5 }])

        const [call] = received
        expect(call?.observer).toBe(observer)
        expect(call?.entries[0]).toMatchObject({ target, isIntersecting: true, intersectionRatio: 1, time: 0, rootBounds: null })
        expect(call?.entries[1]).toMatchObject({ isIntersecting: false, intersectionRatio: 0.3, time: 5 })
        expect(call?.entries[0]?.boundingClientRect.toJSON()).toMatchObject({ width: 0, height: 0 })
    })

    it('tracks instances and installs globally', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver')
        const observer = new MockIntersectionObserver(() => undefined)

        expect(MockIntersectionObserver.instances()).toEqual([observer])
        MockIntersectionObserver.install()
        expect(Reflect.get(globalThis, 'IntersectionObserver')).toBe(MockIntersectionObserver)
        MockIntersectionObserver.uninstall()
        expect(Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver')).toEqual(before)
        MockIntersectionObserver.reset()
        expect(MockIntersectionObserver.instances()).toEqual([])
    })
})

describe('MockResizeObserver', () => {
    it('satisfies the DOM ResizeObserver type', () => {
        const observer = new MockResizeObserver(() => undefined) satisfies ResizeObserver
        expect(observer.observed()).toEqual([])
    })

    it('tracks observed elements', () => {
        const observer = new MockResizeObserver(() => undefined)
        const a = element('a')
        const b = element('b')
        observer.observe(a)
        observer.observe(b)
        observer.unobserve(a)

        expect(observer.observed()).toEqual([b])
        observer.disconnect()
        expect(observer.observed()).toEqual([])
    })

    it('trigger calls the callback with sized entries and the observer', () => {
        const received: { entries: ResizeObserverEntry[]; observer: ResizeObserver }[] = []
        const observer = new MockResizeObserver((entries, source) => received.push({ entries, observer: source }))
        const target = element('t')

        observer.trigger([{ target, width: 120, height: 40 }])

        const [call] = received
        expect(call?.observer).toBe(observer)
        expect(call?.entries[0]).toMatchObject({
            target,
            contentRect: { width: 120, height: 40 },
            contentBoxSize: [{ inlineSize: 120, blockSize: 40 }],
            borderBoxSize: [{ inlineSize: 120, blockSize: 40 }],
        })
    })

    it('tracks instances and installs globally', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver')
        const observer = new MockResizeObserver(() => undefined)

        expect(MockResizeObserver.instances()).toEqual([observer])
        MockResizeObserver.install()
        expect(Reflect.get(globalThis, 'ResizeObserver')).toBe(MockResizeObserver)
        MockResizeObserver.uninstall()
        expect(Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver')).toEqual(before)
        MockResizeObserver.reset()
        expect(MockResizeObserver.instances()).toEqual([])
    })
})
