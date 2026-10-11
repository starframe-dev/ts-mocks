import { describe, expect, it } from 'vitest'
import type { Fetch } from './contract.js'
import { createMemoryNet } from './memory.js'
import { createMockFetch } from './mock.js'

interface User {
    id: number
    name: string
}

/** Example service under test: it depends on `fetch`, not on the network. */
class UserService {
    constructor(
        private readonly http: Fetch,
        private readonly baseUrl: string,
    ) {}

    async fetchUser(id: number): Promise<User> {
        const response = await this.http(`${this.baseUrl}/users/${id}`)
        if (!response.ok) throw new Error(`Unexpected status ${response.status}`)
        return (await response.json()) as User
    }

    async createUser(name: string): Promise<User> {
        const response = await this.http(`${this.baseUrl}/users`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name }),
        })
        return (await response.json()) as User
    }
}

describe('UserService with net mocks', () => {
    it('parses a response from the callback mock', async () => {
        const http = createMockFetch(() => Response.json({ id: 1, name: 'Ann' }))

        expect(await new UserService(http, 'https://api.test').fetchUser(1)).toEqual({ id: 1, name: 'Ann' })
    })

    it('handles an error status', async () => {
        const http = createMockFetch(() => new Response(null, { status: 500 }))

        await expect(new UserService(http, 'https://api.test').fetchUser(1)).rejects.toThrow('Unexpected status 500')
    })

    it('creates a user and sends the right request', async () => {
        const http = createMemoryNet()
        http.register('POST', 'https://api.test/users', { status: 201, body: '{"id":2,"name":"Bob"}' })

        const user = await new UserService(http, 'https://api.test').createUser('Bob')

        expect(user).toEqual({ id: 2, name: 'Bob' })
        const [request] = http.history()
        expect(request?.method).toBe('POST')
        expect(new TextDecoder().decode(request?.body)).toBe('{"name":"Bob"}')
    })
})
