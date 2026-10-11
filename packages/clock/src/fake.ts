import type { Clock, TimerCallback, TimerId } from './contract.js'

interface Timer {
    readonly id: TimerId
    readonly callback: TimerCallback
    readonly interval: number | null
    due: number
    /** Tie-breaker for timers that are due at the same moment. */
    order: number
}

const MIN_INTERVAL_MS = 1

function normalizeDelay(ms: number): number {
    return Number.isFinite(ms) && ms > 0 ? ms : 0
}

/** Deterministic clock: time moves only when the test calls `advance` or `set`. */
export class FakeClock implements Clock {
    private current: number
    private nextId = 1
    private sequence = 0
    private readonly timers = new Map<TimerId, Timer>()

    constructor(start = 0) {
        this.current = start
    }

    now(): number {
        return this.current
    }

    setTimeout(callback: TimerCallback, ms: number): TimerId {
        return this.schedule(callback, normalizeDelay(ms), null)
    }

    setInterval(callback: TimerCallback, ms: number): TimerId {
        const interval = Math.max(MIN_INTERVAL_MS, normalizeDelay(ms))
        return this.schedule(callback, interval, interval)
    }

    clearTimeout(id: TimerId): void {
        this.timers.delete(id)
    }

    clearInterval(id: TimerId): void {
        this.timers.delete(id)
    }

    /** Number of timers that have not fired (or been cleared) yet. */
    pending(): number {
        return this.timers.size
    }

    /** Moves time forward, firing due timers in order of their due time. */
    advance(ms: number): void {
        if (!Number.isFinite(ms) || ms < 0) {
            throw new RangeError(`Cannot advance by ${ms} ms`)
        }
        const target = this.current + ms
        for (let timer = this.nextDue(target); timer !== undefined; timer = this.nextDue(target)) {
            this.current = timer.due
            this.fire(timer)
        }
        this.current = target
    }

    /** Moves time to an absolute point, firing due timers. Time cannot go back. */
    set(ms: number): void {
        if (ms < this.current) {
            throw new RangeError(`Cannot move time back from ${this.current} to ${ms}`)
        }
        this.advance(ms - this.current)
    }

    private schedule(callback: TimerCallback, delay: number, interval: number | null): TimerId {
        const id = this.nextId++
        this.timers.set(id, { id, callback, interval, due: this.current + delay, order: this.sequence++ })
        return id
    }

    private nextDue(target: number): Timer | undefined {
        let best: Timer | undefined
        for (const timer of this.timers.values()) {
            if (timer.due > target) continue
            if (best === undefined || timer.due < best.due || (timer.due === best.due && timer.order < best.order)) {
                best = timer
            }
        }
        return best
    }

    private fire(timer: Timer): void {
        if (timer.interval === null) {
            this.timers.delete(timer.id)
        } else {
            timer.due += timer.interval
            timer.order = this.sequence++
        }
        timer.callback()
    }
}
