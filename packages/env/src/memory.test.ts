import { describe, expect, it } from 'vitest'
import type { Env } from './contract.js'
import { MemoryEnv } from './memory.js'

describe('MemoryEnv', () => {
    it('satisfies the Env contract', () => {
        const env = new MemoryEnv() satisfies Env
        expect(env.all()).toEqual({})
    })

    it('starts with the initial variables', () => {
        const env = new MemoryEnv({ HOME: '/root' })

        expect(env.get('HOME')).toBe('/root')
    })

    it('returns undefined for a missing variable', () => {
        expect(new MemoryEnv().get('NOPE')).toBeUndefined()
    })

    it('sets, overwrites and deletes variables', () => {
        const env = new MemoryEnv()
        env.set('A', '1')
        env.set('A', '2')
        env.set('B', '3')
        env.delete('B')
        env.delete('MISSING')

        expect(env.all()).toEqual({ A: '2' })
    })

    it('all returns a frozen snapshot detached from later changes', () => {
        const env = new MemoryEnv({ A: '1' })
        const snapshot = env.all()
        env.set('A', '2')

        expect(snapshot).toEqual({ A: '1' })
        expect(Object.isFrozen(snapshot)).toBe(true)
    })

    it('does not share state with the initial object', () => {
        const initial = { A: '1' }
        const env = new MemoryEnv(initial)
        env.set('A', '2')

        expect(initial.A).toBe('1')
    })
})
