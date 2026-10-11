import { CallHistory } from '@starframe-dev/ts-mocks-core'
import type { MockFetch, RecordedRequest, RequestHandler } from './contract.js'

/** Creates a `fetch` whose responses come from `handler`. */
export function createMockFetch(handler: RequestHandler): MockFetch {
    const calls = new CallHistory<[RecordedRequest]>()

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const request = new Request(input, init)
        const body = new Uint8Array(await request.clone().arrayBuffer())
        calls.record([{ method: request.method, url: request.url, headers: new Headers(request.headers), body }])
        return handler(request)
    }

    return Object.assign(mockFetch, {
        history: (): readonly RecordedRequest[] => calls.calls().map((call) => call.args[0]),
        reset: (): void => calls.reset(),
    })
}
