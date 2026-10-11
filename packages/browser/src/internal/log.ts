import { CallHistory } from '@starframe-dev/ts-mocks-core'
import type { CallRecord } from '@starframe-dev/ts-mocks-core'

export type MethodCall = readonly [method: string, ...args: readonly unknown[]]
export type MethodHistory = readonly CallRecord<MethodCall>[]

/** Records calls made to a mock's public methods. */
export class MethodLog {
    private readonly calls = new CallHistory<MethodCall>()

    record(method: string, ...args: readonly unknown[]): void {
        this.calls.record([method, ...args])
    }

    history(): MethodHistory {
        return this.calls.calls()
    }

    clear(): void {
        this.calls.reset()
    }
}
