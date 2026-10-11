/** Thrown (as a rejection) when no route matches the request. */
export class NoRouteError extends Error {
    constructor(
        readonly method: string,
        readonly url: string,
    ) {
        super(`No route registered for ${method} ${url}`)
        this.name = 'NoRouteError'
    }
}
