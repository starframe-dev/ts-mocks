import { describe, expect, it } from 'vitest'
import type { Exec } from './contract.js'
import { CommandNotFoundError } from './errors.js'
import { MemoryExec } from './memory.js'

describe('MemoryExec', () => {
    it('satisfies the Exec contract', async () => {
        const exec = new MemoryExec() satisfies Exec
        exec.register('true', [], {})

        expect(await exec.run('true')).toEqual({ code: 0, stdout: '', stderr: '' })
    })

    it('returns the registered result with defaults for omitted fields', async () => {
        const exec = new MemoryExec()
        exec.register('git', ['status'], { stdout: 'clean\n' })
        exec.register('git', ['push'], { code: 1, stderr: 'rejected' })

        expect(await exec.run('git', ['status'])).toEqual({ code: 0, stdout: 'clean\n', stderr: '' })
        expect(await exec.run('git', ['push'])).toEqual({ code: 1, stdout: '', stderr: 'rejected' })
    })

    it('matches arguments exactly', async () => {
        const exec = new MemoryExec()
        exec.register('git', ['log', '-1'], { stdout: 'x' })

        await expect(exec.run('git', ['log'])).rejects.toBeInstanceOf(CommandNotFoundError)
        await expect(exec.run('git', ['log', '-1', '--oneline'])).rejects.toBeInstanceOf(CommandNotFoundError)
        await expect(exec.run('git', ['log', '-2'])).rejects.toBeInstanceOf(CommandNotFoundError)
    })

    it('supports matcher functions and computed results', async () => {
        const exec = new MemoryExec()
        exec.register('echo', (args) => args.length > 0, (args, options) => ({
            stdout: `${args.join(' ')}@${options.cwd ?? '.'}`,
        }))

        expect(await exec.run('echo', ['a', 'b'], { cwd: '/tmp' })).toMatchObject({ stdout: 'a b@/tmp' })
        expect(await exec.run('echo', ['x'])).toMatchObject({ stdout: 'x@.' })
        await expect(exec.run('echo')).rejects.toThrow(CommandNotFoundError)
    })

    it('uses the first matching registration', async () => {
        const exec = new MemoryExec()
        exec.register('cmd', () => true, { stdout: 'first' })
        exec.register('cmd', () => true, { stdout: 'second' })

        expect((await exec.run('cmd')).stdout).toBe('first')
    })

    it('rejects unknown commands with a descriptive error', async () => {
        const exec = new MemoryExec()

        await expect(exec.run('rm', ['-rf', '/'])).rejects.toThrow('Command not registered: rm -rf /')
    })

    it('records every call, including unmatched ones', async () => {
        const exec = new MemoryExec()
        exec.register('ls', [], { stdout: 'a' })
        const args = ['-l']

        await exec.run('ls')
        await exec.run('ls', args, { cwd: '/x', input: 'in' }).catch(() => undefined)
        args.push('mutated')

        expect(exec.history()).toEqual([
            { command: 'ls', args: [], options: {} },
            { command: 'ls', args: ['-l'], options: { cwd: '/x', input: 'in' } },
        ])
    })

    it('reset clears the history but keeps registrations', async () => {
        const exec = new MemoryExec()
        exec.register('ls', [], { stdout: 'a' })
        await exec.run('ls')
        exec.reset()

        expect(exec.history()).toEqual([])
        expect((await exec.run('ls')).stdout).toBe('a')
    })
})
