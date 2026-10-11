import { describe, expect, it } from 'vitest'
import type { Random } from './contract.js'
import { SeededRandom } from './seeded.js'

const sequence = (random: Random, count: number): number[] => Array.from({ length: count }, () => random.next())

describe('SeededRandom', () => {
    it('satisfies the Random contract', () => {
        const random = new SeededRandom(1) satisfies Random
        expect(random.next()).toBeGreaterThanOrEqual(0)
    })

    it('gives the same sequence for the same seed', () => {
        expect(sequence(new SeededRandom(42), 20)).toEqual(sequence(new SeededRandom(42), 20))
    })

    it('gives different sequences for different seeds', () => {
        expect(sequence(new SeededRandom(1), 5)).not.toEqual(sequence(new SeededRandom(2), 5))
    })

    it('next stays within [0, 1)', () => {
        for (const value of sequence(new SeededRandom(7), 1000)) {
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThan(1)
        }
    })

    it('int covers the whole inclusive range', () => {
        const random = new SeededRandom(3)
        const seen = new Set(Array.from({ length: 500 }, () => random.int(1, 3)))

        expect([...seen].sort()).toEqual([1, 2, 3])
    })

    it('int accepts a single-value range', () => {
        expect(new SeededRandom(1).int(5, 5)).toBe(5)
    })

    it('int rejects invalid ranges', () => {
        const random = new SeededRandom(1)

        expect(() => random.int(3, 1)).toThrow(RangeError)
        expect(() => random.int(0.5, 2)).toThrow(RangeError)
    })

    it('bytes returns the requested number of bytes', () => {
        const bytes = new SeededRandom(1).bytes(32)

        expect(bytes).toBeInstanceOf(Uint8Array)
        expect(bytes).toHaveLength(32)
        expect(new SeededRandom(1).bytes(0)).toHaveLength(0)
    })

    it('bytes rejects invalid lengths', () => {
        expect(() => new SeededRandom(1).bytes(-1)).toThrow(RangeError)
        expect(() => new SeededRandom(1).bytes(1.5)).toThrow(RangeError)
    })

    it('uuid is a valid, deterministic version 4 UUID', () => {
        const uuid = new SeededRandom(9).uuid()

        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
        expect(new SeededRandom(9).uuid()).toBe(uuid)
    })

    it('consecutive uuids differ', () => {
        const random = new SeededRandom(9)

        expect(random.uuid()).not.toBe(random.uuid())
    })
})
