export interface CallRecord<TArgs extends readonly unknown[]> {
    readonly args: TArgs
    /** Timestamp from the injected source; defaults to the call index. */
    readonly at: number
}

export type TimeSource = () => number

/** Records calls made to a mock, in order. */
export class CallHistory<TArgs extends readonly unknown[]> {
    private readonly records: CallRecord<TArgs>[] = []
    private readonly now: TimeSource

    constructor(now?: TimeSource) {
        this.now = now ?? (() => this.records.length)
    }

    record(args: TArgs): void {
        this.records.push({ args, at: this.now() })
    }

    /** Returns a copy, so callers cannot mutate the history. */
    calls(): readonly CallRecord<TArgs>[] {
        return [...this.records]
    }

    reset(): void {
        this.records.length = 0
    }
}
