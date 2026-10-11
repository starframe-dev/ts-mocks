import type { MemoryNet, RouteResponse } from './contract.js'
import { NoRouteError } from './errors.js'
import { createMockFetch } from './mock.js'

const DEFAULT_STATUS = 200

function routeKey(method: string, url: string): string {
    return `${method.toUpperCase()} ${new URL(url).href}`
}

/** Creates a `fetch` that answers from registered routes, matching by method and URL. */
export function createMemoryNet(): MemoryNet {
    const routes = new Map<string, RouteResponse>()

    const net = createMockFetch((request) => {
        const route = routes.get(routeKey(request.method, request.url))
        if (route === undefined) throw new NoRouteError(request.method, request.url)
        return new Response(route.body, { status: route.status ?? DEFAULT_STATUS, headers: route.headers })
    })

    return Object.assign(net, {
        register: (method: string, url: string, response: RouteResponse = {}): void => {
            routes.set(routeKey(method, url), response)
        },
    })
}
