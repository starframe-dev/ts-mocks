import { describe, expect, it } from 'vitest'
import type { Clock } from './contract.js'
import { FakeClock } from './fake.js'

describe('FakeClock', () => {
    it('satisfies the Clock contract', () => {
        const clock = new FakeClock() satisfies Clock
        expect(clock.now()).toBe(0)
    })

    it('starts at the given time', () => {
        expect(new FakeClock(1000).now()).toBe(1000)
    })

    it('fires a timeout only once its time has come', () => {
        const clock = new FakeClock()
        const calls: number[] = []
        clock.setTimeout(() => calls.push(clock.now()), 100)

        clock.advance(99)
        expect(calls).toEqual([])
        clock.advance(1)
        expect(calls).toEqual([100])
        clock.advance(500)
        expect(calls).toEqual([100])
        expect(clock.now()).toBe(600)
    })

    it('fires timers in due order, then in creation order', () => {
        const clock = new FakeClock()
        const order: string[] = []
        clock.setTimeout(() => order.push('late'), 50)
        clock.setTimeout(() => order.push('first'), 10)
        clock.setTimeout(() => order.push('second'), 10)

        clock.advance(100)

        expect(order).toEqual(['first', 'second', 'late'])
    })

    it('repeats intervals', () => {
        const clock = new FakeClock()
        let count = 0
        clock.setInterval(() => count++, 10)

        clock.advance(35)

        expect(count).toBe(3)
        expect(clock.pending()).toBe(1)
    })

    it('treats a zero interval as one millisecond', () => {
        const clock = new FakeClock()
        let count = 0
        clock.setInterval(() => count++, 0)

        clock.advance(3)

        expect(count).toBe(3)
    })

    it('fires a zero-delay timeout on advance(0)', () => {
        const clock = new FakeClock()
        let fired = false
        clock.setTimeout(() => (fired = true), 0)
        clock.setTimeout(() => undefined, Number.NaN)

        clock.advance(0)

        expect(fired).toBe(true)
        expect(clock.pending()).toBe(0)
    })

    it('runs timers scheduled by callbacks within the same advance', () => {
        const clock = new FakeClock()
        const times: number[] = []
        clock.setTimeout(() => {
            times.push(clock.now())
            clock.setTimeout(() => times.push(clock.now()), 5)
        }, 10)

        clock.advance(20)

        expect(times).toEqual([10, 15])
    })

    it('clears timeouts and intervals', () => {
        const clock = new FakeClock()
        let count = 0
        const timeout = clock.setTimeout(() => count++, 10)
        const interval = clock.setInterval(() => count++, 10)
        clock.clearTimeout(timeout)
        clock.clearInterval(interval)

        clock.advance(100)

        expect(count).toBe(0)
        expect(clock.pending()).toBe(0)
    })

    it('allows an interval to clear itself', () => {
        const clock = new FakeClock()
        let count = 0
        const id = clock.setInterval(() => {
            count++
            if (count === 2) clock.clearInterval(id)
        }, 10)

        clock.advance(100)

        expect(count).toBe(2)
    })

    it('set moves to an absolute time and fires timers', () => {
        const clock = new FakeClock(100)
        let fired = false
        clock.setTimeout(() => (fired = true), 50)

        clock.set(200)

        expect(fired).toBe(true)
        expect(clock.now()).toBe(200)
    })

    it('rejects moving time backwards or by invalid amounts', () => {
        const clock = new FakeClock(100)

        expect(() => clock.set(50)).toThrow(RangeError)
        expect(() => clock.advance(-1)).toThrow(RangeError)
        expect(() => clock.advance(Number.NaN)).toThrow(RangeError)
    })
})
