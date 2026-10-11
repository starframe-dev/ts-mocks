import { describe, expect, it } from 'vitest'
import type { Clock } from './contract.js'
import { SystemClock, systemClock } from './system.js'

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('SystemClock', () => {
    it('satisfies the Clock contract and reports real time', () => {
        const clock = new SystemClock() satisfies Clock
        expect(Math.abs(clock.now() - Date.now())).toBeLessThan(50)
        expect(systemClock).toBeInstanceOf(SystemClock)
    })

    it('fires a timeout', async () => {
        const clock = new SystemClock()
        let fired = false
        clock.setTimeout(() => (fired = true), 1)

        await wait(20)

        expect(fired).toBe(true)
    })

    it('does not fire a cleared timeout', async () => {
        const clock = new SystemClock()
        let fired = false
        const id = clock.setTimeout(() => (fired = true), 5)
        clock.clearTimeout(id)

        await wait(30)

        expect(fired).toBe(false)
    })

    it('repeats an interval until cleared', async () => {
        const clock = new SystemClock()
        let count = 0
        const id = clock.setInterval(() => count++, 2)

        await wait(40)
        clock.clearInterval(id)
        const seen = count
        await wait(20)

        expect(seen).toBeGreaterThanOrEqual(2)
        expect(count).toBe(seen)
    })

    it('ignores unknown ids', () => {
        expect(() => new SystemClock().clearTimeout(999)).not.toThrow()
    })
})
