import type { Clock, TimerCallback, TimerId } from './contract.js'

/** Real clock backed by `Date` and the global timers. */
export class SystemClock implements Clock {
    private nextId = 1
    private readonly handles = new Map<TimerId, ReturnType<typeof setTimeout>>()

    now(): number {
        return Date.now()
    }

    setTimeout(callback: TimerCallback, ms: number): TimerId {
        const id = this.nextId++
        const handle = setTimeout(() => {
            this.handles.delete(id)
            callback()
        }, ms)
        this.handles.set(id, handle)
        return id
    }

    setInterval(callback: TimerCallback, ms: number): TimerId {
        const id = this.nextId++
        this.handles.set(id, setInterval(callback, ms))
        return id
    }

    clearTimeout(id: TimerId): void {
        this.release(id)
    }

    clearInterval(id: TimerId): void {
        this.release(id)
    }

    private release(id: TimerId): void {
        const handle = this.handles.get(id)
        if (handle === undefined) return
        // Timeout and interval handles share one pool, so clearTimeout releases both.
        clearTimeout(handle)
        this.handles.delete(id)
    }
}

export const systemClock = new SystemClock()
