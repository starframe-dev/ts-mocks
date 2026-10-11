export type TimerId = number
export type TimerCallback = () => void

/** Source of time and timers; inject it instead of using globals. */
export interface Clock {
    /** Milliseconds since the epoch. */
    now(): number
    setTimeout(callback: TimerCallback, ms: number): TimerId
    clearTimeout(id: TimerId): void
    setInterval(callback: TimerCallback, ms: number): TimerId
    clearInterval(id: TimerId): void
}
