/** Source of randomness; inject it instead of using `Math.random` or `crypto`. */
export interface Random {
    /** A number in the range [0, 1). */
    next(): number
    /** An integer in the range [min, max], both inclusive. */
    int(min: number, max: number): number
    /** A version 4 UUID in canonical text form. */
    uuid(): string
    bytes(length: number): Uint8Array
}
