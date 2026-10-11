import { GlobalInstaller } from './internal/global.js'
import { MethodLog } from './internal/log.js'
import type { MethodHistory } from './internal/log.js'

export type StorageName = 'localStorage' | 'sessionStorage'

/** Dispatched on the storage after a change; `key` is null for `clear()`. */
export class StorageChangeEvent extends Event {
    constructor(
        readonly key: string | null,
        readonly oldValue: string | null,
        readonly newValue: string | null,
    ) {
        super('storage')
    }
}

/** In-memory `Storage` (`localStorage` / `sessionStorage`). Named property access is not supported. */
export class MemoryStorage extends EventTarget implements Storage {
    private readonly items = new Map<string, string>()
    private readonly log = new MethodLog()
    private readonly globals = new GlobalInstaller()

    get length(): number {
        return this.items.size
    }

    key(index: number): string | null {
        return [...this.items.keys()][index] ?? null
    }

    getItem(key: string): string | null {
        return this.items.get(String(key)) ?? null
    }

    setItem(key: string, value: string): void {
        const name = String(key)
        const next = String(value)
        this.log.record('setItem', name, next)
        const previous = this.items.get(name) ?? null
        this.items.set(name, next)
        if (previous !== next) this.dispatchEvent(new StorageChangeEvent(name, previous, next))
    }

    removeItem(key: string): void {
        const name = String(key)
        this.log.record('removeItem', name)
        const previous = this.items.get(name)
        if (previous === undefined) return
        this.items.delete(name)
        this.dispatchEvent(new StorageChangeEvent(name, previous, null))
    }

    clear(): void {
        this.log.record('clear')
        if (this.items.size === 0) return
        this.items.clear()
        this.dispatchEvent(new StorageChangeEvent(null, null, null))
    }

    history(): MethodHistory {
        return this.log.history()
    }

    clearHistory(): void {
        this.log.clear()
    }

    /** Puts this storage into `globalThis` (as `localStorage` by default). */
    install(name: StorageName = 'localStorage'): void {
        this.globals.install(name, this)
    }

    uninstall(): void {
        this.globals.uninstall()
    }
}
