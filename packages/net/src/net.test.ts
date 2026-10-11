import { describe, expect, it } from 'vitest'
import type { Fetch } from './contract.js'
import { NoRouteError } from './errors.js'
import { createMemoryNet } from './memory.js'
import { createMockFetch } from './mock.js'

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes)

describe('createMockFetch', () => {
    it('is accepted wherever fetch is expected', async () => {
        const mock = createMockFetch(() => new Response('ok'))
        const fetchLike: Fetch = mock

        expect(await (await fetchLike('https://example.com/')).text()).toBe('ok')
    })

    it('passes a Request to the handler', async () => {
        const mock = createMockFetch(async (request) => new Response(`${request.method} ${request.url}`))

        const response = await mock('https://example.com/a', { method: 'DELETE' })

        expect(await response.text()).toBe('DELETE https://example.com/a')
    })

    it('records method, url, headers and body', async () => {
        const mock = createMockFetch(() => new Response(null, { status: 204 }))

        await mock('https://example.com/users', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Ann' }),
        })
        await mock(new Request('https://example.com/ping'))

        const [post, get] = mock.history()
        expect(post).toMatchObject({ method: 'POST', url: 'https://example.com/users' })
        expect(post?.headers.get('content-type')).toBe('application/json')
        expect(decode(post?.body ?? new Uint8Array())).toBe('{"name":"Ann"}')
        expect(get).toMatchObject({ method: 'GET', url: 'https://example.com/ping' })
        expect(get?.body).toHaveLength(0)
    })

    it('lets the handler read the body after it was recorded', async () => {
        const mock = createMockFetch(async (request) => new Response(await request.text()))

        const response = await mock('https://example.com/', { method: 'POST', body: 'payload' })

        expect(await response.text()).toBe('payload')
    })

    it('propagates handler errors as rejections and still records the request', async () => {
        const mock = createMockFetch(() => {
            throw new Error('network down')
        })

        await expect(mock('https://example.com/')).rejects.toThrow('network down')
        expect(mock.history()).toHaveLength(1)
    })

    it('reset clears the history', async () => {
        const mock = createMockFetch(() => new Response('ok'))
        await mock('https://example.com/')
        mock.reset()

        expect(mock.history()).toEqual([])
    })
})

describe('createMemoryNet', () => {
    it('is accepted wherever fetch is expected', async () => {
        const net = createMemoryNet()
        net.register('GET', 'https://example.com/')
        const fetchLike: Fetch = net

        expect((await fetchLike('https://example.com/')).status).toBe(200)
    })

    it('answers registered routes with status, body and headers', async () => {
        const net = createMemoryNet()
        net.register('get', 'https://api.test/user/1', {
            status: 201,
            body: '{"id":1}',
            headers: { 'content-type': 'application/json' },
        })

        const response = await net('https://api.test/user/1')

        expect(response.status).toBe(201)
        expect(response.headers.get('content-type')).toBe('application/json')
        expect(await response.json()).toEqual({ id: 1 })
    })

    it('supports binary bodies and bodiless statuses', async () => {
        const net = createMemoryNet()
        net.register('GET', 'https://api.test/bin', { body: new Uint8Array([1, 2, 3]) })
        net.register('DELETE', 'https://api.test/item', { status: 204 })

        expect([...new Uint8Array(await (await net('https://api.test/bin')).arrayBuffer())]).toEqual([1, 2, 3])
        expect((await net('https://api.test/item', { method: 'DELETE' })).status).toBe(204)
    })

    it('matches by method and normalised URL', async () => {
        const net = createMemoryNet()
        net.register('POST', 'https://api.test', { status: 201 })

        expect((await net('https://api.test/', { method: 'POST' })).status).toBe(201)
        await expect(net('https://api.test/')).rejects.toBeInstanceOf(NoRouteError)
    })

    it('serves different endpoints and replaces a re-registered route', async () => {
        const net = createMemoryNet()
        net.register('GET', 'https://api.test/a', { body: 'a' })
        net.register('GET', 'https://api.test/b', { body: 'b' })
        net.register('GET', 'https://api.test/a', { body: 'a2' })

        expect(await (await net('https://api.test/a')).text()).toBe('a2')
        expect(await (await net('https://api.test/b')).text()).toBe('b')
    })

    it('gives every call a fresh response body', async () => {
        const net = createMemoryNet()
        net.register('GET', 'https://api.test/a', { body: 'x' })

        expect(await (await net('https://api.test/a')).text()).toBe('x')
        expect(await (await net('https://api.test/a')).text()).toBe('x')
    })

    it('rejects unknown routes with a descriptive error and records them', async () => {
        const net = createMemoryNet()

        await expect(net('https://api.test/none')).rejects.toThrow('No route registered for GET https://api.test/none')
        expect(net.history()).toHaveLength(1)
    })

    it('rejects invalid URLs on register', () => {
        expect(() => createMemoryNet().register('GET', 'not a url')).toThrow(TypeError)
    })
})
