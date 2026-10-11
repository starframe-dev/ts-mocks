import { describe, expect, it } from 'vitest'
import { MemoryStorage } from './storage.js'
import type { StorageChangeEvent } from './storage.js'

function collect(storage: MemoryStorage): StorageChangeEvent[] {
    const events: StorageChangeEvent[] = []
    storage.addEventListener('storage', (event) => events.push(event as StorageChangeEvent))
    return events
}

describe('MemoryStorage', () => {
    it('satisfies the DOM Storage type', () => {
        const storage = new MemoryStorage() satisfies Storage
        expect(storage.length).toBe(0)
    })

    it('stores, reads and removes items', () => {
        const storage = new MemoryStorage()
        storage.setItem('a', '1')
        storage.setItem('b', '2')
        storage.setItem('a', '3')

        expect(storage.getItem('a')).toBe('3')
        expect(storage.getItem('missing')).toBeNull()
        expect(storage.length).toBe(2)
        expect(storage.key(0)).toBe('a')
        expect(storage.key(1)).toBe('b')
        expect(storage.key(2)).toBeNull()

        storage.removeItem('a')
        expect(storage.length).toBe(1)
        storage.clear()
        expect(storage.length).toBe(0)
    })

    it('fires storage events with old and new values', () => {
        const storage = new MemoryStorage()
        const events = collect(storage)

        storage.setItem('k', 'v1')
        storage.setItem('k', 'v2')
        storage.removeItem('k')
        storage.setItem('x', '1')
        storage.clear()

        expect(events.map((e) => [e.key, e.oldValue, e.newValue])).toEqual([
            ['k', null, 'v1'],
            ['k', 'v1', 'v2'],
            ['k', 'v2', null],
            ['x', null, '1'],
            [null, null, null],
        ])
        expect(events.every((e) => e.type === 'storage')).toBe(true)
    })

    it('does not fire events when nothing changes', () => {
        const storage = new MemoryStorage()
        storage.setItem('k', 'v')
        const events = collect(storage)

        storage.setItem('k', 'v')
        storage.removeItem('missing')
        storage.clear()
        storage.clear()

        expect(events).toHaveLength(1)
    })

    it('records the history of calls', () => {
        const storage = new MemoryStorage()
        storage.setItem('k', 'v')
        storage.removeItem('k')
        storage.clear()

        expect(storage.history().map((call) => call.args)).toEqual([['setItem', 'k', 'v'], ['removeItem', 'k'], ['clear']])
        storage.clearHistory()
        expect(storage.history()).toEqual([])
    })

    it('installs as localStorage or sessionStorage and restores the originals', () => {
        const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
        const beforeSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
        const local = new MemoryStorage()
        const session = new MemoryStorage()

        local.install()
        session.install('sessionStorage')
        expect(Reflect.get(globalThis, 'localStorage')).toBe(local)
        expect(Reflect.get(globalThis, 'sessionStorage')).toBe(session)

        local.uninstall()
        session.uninstall()
        expect(Object.getOwnPropertyDescriptor(globalThis, 'localStorage')).toEqual(before)
        expect(Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')).toEqual(beforeSession)
    })
})
