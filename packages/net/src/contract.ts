/** The HTTP client contract is the standard `fetch`. */
export type Fetch = typeof fetch

export interface RecordedRequest {
    readonly method: string
    readonly url: string
    readonly headers: Headers
    readonly body: Uint8Array
}

export type RequestHandler = (request: Request) => Response | Promise<Response>

export interface RouteResponse {
    /** Defaults to 200. */
    readonly status?: number
    readonly body?: string | Uint8Array<ArrayBuffer>
    readonly headers?: HeadersInit
}

export interface RequestLog {
    /** Every request made through the mock, matched or not, in order. */
    history(): readonly RecordedRequest[]
    /** Clears the request history. */
    reset(): void
}

/** A `fetch` replacement that delegates to a callback. */
export type MockFetch = Fetch & RequestLog

/** A `fetch` replacement that answers from registered routes. */
export type MemoryNet = Fetch &
    RequestLog & {
        /** Registers (or replaces) the response for a method and absolute URL. */
        register(method: string, url: string, response?: RouteResponse): void
    }
