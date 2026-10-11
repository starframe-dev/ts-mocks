import type { Random } from './contract.js'

const UINT32_RANGE = 2 ** 32
const BYTE_RANGE = 256
const UUID_BYTES = 16
const UUID_VARIANTS = '89ab'

/** Deterministic generator (mulberry32): the same seed gives the same sequence. */
export class SeededRandom implements Random {
    private state: number

    constructor(seed: number) {
        this.state = seed >>> 0
    }

    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0
        let t = this.state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE
    }

    int(min: number, max: number): number {
        if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
            throw new RangeError(`Invalid integer range [${min}, ${max}]`)
        }
        return min + Math.floor(this.next() * (max - min + 1))
    }

    bytes(length: number): Uint8Array {
        if (!Number.isInteger(length) || length < 0) {
            throw new RangeError(`Invalid byte length ${length}`)
        }
        return Uint8Array.from({ length }, () => Math.floor(this.next() * BYTE_RANGE))
    }

    uuid(): string {
        const hex = Array.from(this.bytes(UUID_BYTES), (byte) => byte.toString(16).padStart(2, '0')).join('')
        const variant = UUID_VARIANTS.charAt(parseInt(hex.charAt(16), 16) & 3)
        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            `4${hex.slice(13, 16)}`,
            `${variant}${hex.slice(17, 20)}`,
            hex.slice(20, 32),
        ].join('-')
    }
}
