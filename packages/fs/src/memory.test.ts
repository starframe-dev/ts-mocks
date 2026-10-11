import { describe, expect, it } from 'vitest'
import { FakeClock } from '@starframe-dev/ts-mocks-clock'
import type { FileSystem } from './contract.js'
import { FsError } from './errors.js'
import { MemoryFS } from './memory.js'

function create(initial: Record<string, string | Uint8Array> = {}, cwd?: string): { fs: MemoryFS; clock: FakeClock } {
    const clock = new FakeClock(1000)
    return { fs: new MemoryFS(clock, initial, cwd), clock }
}

function codeOf(action: () => unknown): string | undefined {
    try {
        action()
    } catch (error) {
        return error instanceof FsError ? error.code : String(error)
    }
    return undefined
}

describe('MemoryFS contract', () => {
    it('satisfies the FileSystem contract', () => {
        const { fs } = create()
        const contract = fs satisfies FileSystem
        expect(contract.existsSync('/')).toBe(true)
    })

    it('rejects a relative cwd', () => {
        expect(() => new MemoryFS(new FakeClock(), {}, 'relative')).toThrow(RangeError)
    })
})

describe('initial files and snapshot', () => {
    it('creates parent directories for initial files', () => {
        const { fs } = create({ '/a/b/c.txt': 'hi', '/top.txt': Buffer.from('bytes') })

        expect(fs.readdirSync('/a/b')).toEqual(['c.txt'])
        expect(fs.readFileSync('/top.txt', 'utf8')).toBe('bytes')
    })

    it('snapshot returns file contents keyed by absolute path', () => {
        const { fs } = create({ '/b/two.txt': '2', '/a.txt': '1', '/b/one.txt': '3' })
        fs.mkdirSync('/empty')

        expect(fs.snapshot()).toEqual({ '/a.txt': '1', '/b/one.txt': '3', '/b/two.txt': '2' })
    })
})

describe('readFile / writeFile', () => {
    it('writes and reads Buffers and strings', () => {
        const { fs } = create()
        fs.writeFileSync('/a.txt', 'héllo')

        expect(fs.readFileSync('/a.txt')).toEqual(Buffer.from('héllo'))
        expect(fs.readFileSync('/a.txt', 'utf8')).toBe('héllo')
        expect(fs.readFileSync('/a.txt', { encoding: 'utf8' })).toBe('héllo')
    })

    it('honours the write encoding and binary data', () => {
        const { fs } = create()
        fs.writeFileSync('/hex.bin', 'ff00', 'hex')
        fs.writeFileSync('/obj.bin', '616263', { encoding: 'hex' })
        fs.writeFileSync('/raw.bin', new Uint8Array([1, 2, 3]))

        expect([...fs.readFileSync('/hex.bin')]).toEqual([255, 0])
        expect(fs.readFileSync('/obj.bin', 'utf8')).toBe('abc')
        expect([...fs.readFileSync('/raw.bin')]).toEqual([1, 2, 3])
    })

    it('returns copies so callers cannot mutate stored data', () => {
        const { fs } = create({ '/a.txt': 'abc' })
        const read = fs.readFileSync('/a.txt')
        read[0] = 0

        expect(fs.readFileSync('/a.txt', 'utf8')).toBe('abc')
    })

    it('does not alias the written Uint8Array', () => {
        const { fs } = create()
        const bytes = new Uint8Array([1, 2])
        fs.writeFileSync('/a', bytes)
        bytes[0] = 9

        expect([...fs.readFileSync('/a')]).toEqual([1, 2])
    })

    it('overwrites existing files', () => {
        const { fs } = create({ '/a.txt': 'old' })
        fs.writeFileSync('/a.txt', 'new')

        expect(fs.readFileSync('/a.txt', 'utf8')).toBe('new')
    })

    it('reports ENOENT for missing files and parents', () => {
        const { fs } = create()

        expect(codeOf(() => fs.readFileSync('/missing'))).toBe('ENOENT')
        expect(codeOf(() => fs.writeFileSync('/no/parent.txt', 'x'))).toBe('ENOENT')
    })

    it('reports EISDIR when the target is a directory', () => {
        const { fs } = create({ '/d/f': 'x' })

        expect(codeOf(() => fs.readFileSync('/d'))).toBe('EISDIR')
        expect(codeOf(() => fs.writeFileSync('/d', 'x'))).toBe('EISDIR')
        expect(codeOf(() => fs.appendFileSync('/d', 'x'))).toBe('EISDIR')
    })

    it('reports ENOTDIR when a path goes through a file', () => {
        const { fs } = create({ '/f': 'x' })

        expect(codeOf(() => fs.readFileSync('/f/child'))).toBe('ENOTDIR')
        expect(codeOf(() => fs.writeFileSync('/f/child', 'x'))).toBe('ENOTDIR')
        expect(fs.existsSync('/f/child')).toBe(false)
    })

    it('resolves relative paths against cwd', () => {
        const { fs } = create({ '/work/a.txt': 'a' }, '/work')

        expect(fs.readFileSync('a.txt', 'utf8')).toBe('a')
        expect(fs.readFileSync('../work/./a.txt', 'utf8')).toBe('a')
    })
})

describe('errors', () => {
    it('look like Node errors', () => {
        const { fs } = create()
        let caught: unknown
        try {
            fs.readFileSync('/missing.txt')
        } catch (error) {
            caught = error
        }

        expect(caught).toBeInstanceOf(FsError)
        expect(caught).toMatchObject({
            code: 'ENOENT',
            syscall: 'open',
            path: '/missing.txt',
            message: "ENOENT: no such file or directory, open '/missing.txt'",
        })
        expect((caught as FsError).errno).toBeLessThan(0)
    })

    it('omit the path when reading a directory, like Node', () => {
        const { fs } = create({ '/d/f': 'x' })
        let caught: unknown
        try {
            fs.readFileSync('/d')
        } catch (error) {
            caught = error
        }

        expect(caught).toMatchObject({ code: 'EISDIR', syscall: 'read', message: 'EISDIR: illegal operation on a directory, read' })
        expect((caught as FsError).path).toBeUndefined()
    })

    it('use lstat for a missing path in rm and a positive errno for ERR_FS_EISDIR', () => {
        const { fs } = create({ '/d/f': 'x' })

        expect(() => fs.rmSync('/missing')).toThrow("ENOENT: no such file or directory, lstat '/missing'")
        try {
            fs.rmSync('/d')
        } catch (error) {
            expect((error as FsError).errno).toBeGreaterThan(0)
        }
    })

    it('include the destination for two-path operations', () => {
        const { fs } = create()

        expect(() => fs.renameSync('/a', '/b')).toThrow("ENOENT: no such file or directory, rename '/a' -> '/b'")
    })
})

describe('appendFile', () => {
    it('creates a missing file and appends to an existing one', () => {
        const { fs } = create()
        fs.appendFileSync('/log', 'a')
        fs.appendFileSync('/log', Buffer.from('b'))
        fs.appendFileSync('/log', 'c', 'utf8')

        expect(fs.readFileSync('/log', 'utf8')).toBe('abc')
    })
})

describe('mkdir', () => {
    it('creates a directory', () => {
        const { fs } = create()

        expect(fs.mkdirSync('/d')).toBeUndefined()
        expect(fs.statSync('/d').isDirectory()).toBe(true)
    })

    it('fails without recursive when the parent is missing or the path exists', () => {
        const { fs } = create({ '/f': 'x' })
        fs.mkdirSync('/d')

        expect(codeOf(() => fs.mkdirSync('/a/b'))).toBe('ENOENT')
        expect(codeOf(() => fs.mkdirSync('/d'))).toBe('EEXIST')
        expect(codeOf(() => fs.mkdirSync('/f'))).toBe('EEXIST')
        expect(codeOf(() => fs.mkdirSync('/f/x'))).toBe('ENOTDIR')
    })

    it('recursive creates all levels and returns the first created directory', () => {
        const { fs } = create()
        fs.mkdirSync('/a')

        expect(fs.mkdirSync('/a/b/c', { recursive: true })).toBe('/a/b')
        expect(fs.mkdirSync('/a/b/c', { recursive: true })).toBeUndefined()
        expect(fs.statSync('/a/b/c').isDirectory()).toBe(true)
    })

    it('recursive fails when a file is in the way', () => {
        const { fs } = create({ '/f': 'x' })

        expect(codeOf(() => fs.mkdirSync('/f', { recursive: true }))).toBe('EEXIST')
        expect(codeOf(() => fs.mkdirSync('/f/x/y', { recursive: true }))).toBe('ENOTDIR')
    })
})

describe('readdir', () => {
    it('lists entries sorted by name', () => {
        const { fs } = create({ '/d/b': '', '/d/a': '', '/d/sub/x': '' })

        expect(fs.readdirSync('/d')).toEqual(['a', 'b', 'sub'])
    })

    it('fails for missing paths and files', () => {
        const { fs } = create({ '/f': '' })

        expect(codeOf(() => fs.readdirSync('/missing'))).toBe('ENOENT')
        expect(codeOf(() => fs.readdirSync('/f'))).toBe('ENOTDIR')
    })
})

describe('stat / lstat', () => {
    it('describes files and directories', () => {
        const { fs } = create({ '/d/f.txt': 'abcd' })
        const file = fs.statSync('/d/f.txt')
        const dir = fs.lstatSync('/d')

        expect(file).toMatchObject({ size: 4, mtimeMs: 1000 })
        expect([file.isFile(), file.isDirectory()]).toEqual([true, false])
        expect([dir.isFile(), dir.isDirectory()]).toEqual([false, true])
    })

    it('fails for missing paths', () => {
        const { fs } = create()

        expect(codeOf(() => fs.statSync('/x'))).toBe('ENOENT')
        expect(() => fs.lstatSync('/x')).toThrow("lstat '/x'")
    })

    it('takes modification times from the clock', () => {
        const { fs, clock } = create({ '/a': '1' })
        clock.advance(500)
        fs.writeFileSync('/a', '2')
        expect(fs.statSync('/a').mtimeMs).toBe(1500)

        clock.advance(500)
        fs.appendFileSync('/a', '3')
        expect(fs.statSync('/a').mtimeMs).toBe(2000)

        clock.advance(500)
        fs.writeFileSync('/new', 'x')
        expect(fs.statSync('/').mtimeMs).toBe(2500)
    })
})

describe('rm', () => {
    it('removes files', () => {
        const { fs } = create({ '/a': 'x' })
        fs.rmSync('/a')

        expect(fs.existsSync('/a')).toBe(false)
    })

    it('requires recursive for directories', () => {
        const { fs } = create({ '/d/f': 'x' })
        fs.mkdirSync('/empty')

        expect(codeOf(() => fs.rmSync('/d'))).toBe('ERR_FS_EISDIR')
        expect(codeOf(() => fs.rmSync('/empty'))).toBe('ERR_FS_EISDIR')
        fs.rmSync('/d', { recursive: true })
        expect(fs.existsSync('/d')).toBe(false)
    })

    it('fails for missing paths unless force is set', () => {
        const { fs } = create()

        expect(codeOf(() => fs.rmSync('/x'))).toBe('ENOENT')
        expect(() => fs.rmSync('/x', { force: true })).not.toThrow()
    })

    it('refuses to remove the root', () => {
        const { fs } = create()

        expect(codeOf(() => fs.rmSync('/', { recursive: true }))).toBe('EPERM')
    })
})

describe('rename', () => {
    it('moves files and directories', () => {
        const { fs } = create({ '/a.txt': 'a', '/d/f': 'f' })
        fs.mkdirSync('/target')
        fs.renameSync('/a.txt', '/target/b.txt')
        fs.renameSync('/d', '/target/d2')

        expect(fs.readFileSync('/target/b.txt', 'utf8')).toBe('a')
        expect(fs.readFileSync('/target/d2/f', 'utf8')).toBe('f')
        expect(fs.existsSync('/a.txt')).toBe(false)
        expect(fs.existsSync('/d')).toBe(false)
    })

    it('replaces an existing file and an empty directory', () => {
        const { fs } = create({ '/a': 'a', '/b': 'b' })
        fs.mkdirSync('/src')
        fs.mkdirSync('/dst')
        fs.renameSync('/a', '/b')
        fs.renameSync('/src', '/dst')

        expect(fs.readFileSync('/b', 'utf8')).toBe('a')
        expect(fs.statSync('/dst').isDirectory()).toBe(true)
    })

    it('does nothing when source and destination are the same', () => {
        const { fs } = create({ '/a': 'a' })
        fs.renameSync('/a', '/a')

        expect(fs.readFileSync('/a', 'utf8')).toBe('a')
    })

    it('reports conflicts', () => {
        const { fs } = create({ '/file': 'x', '/d/inner': 'y', '/other/inner': 'z' })

        expect(codeOf(() => fs.renameSync('/missing', '/x'))).toBe('ENOENT')
        expect(codeOf(() => fs.renameSync('/file', '/no/parent'))).toBe('ENOENT')
        expect(codeOf(() => fs.renameSync('/file', '/d'))).toBe('EISDIR')
        expect(codeOf(() => fs.renameSync('/d', '/file'))).toBe('ENOTDIR')
        expect(codeOf(() => fs.renameSync('/d', '/other'))).toBe('ENOTEMPTY')
        expect(codeOf(() => fs.renameSync('/d', '/d/sub'))).toBe('EINVAL')
        expect(codeOf(() => fs.renameSync('/', '/x'))).toBe('EPERM')
        expect(codeOf(() => fs.renameSync('/file', '/'))).toBe('EPERM')
    })
})

describe('copyFile', () => {
    it('copies content without aliasing', () => {
        const { fs } = create({ '/a': 'x' })
        fs.copyFileSync('/a', '/b')
        fs.writeFileSync('/a', 'changed')

        expect(fs.readFileSync('/b', 'utf8')).toBe('x')
    })

    it('overwrites an existing destination file', () => {
        const { fs } = create({ '/a': 'new', '/b': 'old' })
        fs.copyFileSync('/a', '/b')

        expect(fs.readFileSync('/b', 'utf8')).toBe('new')
    })

    it('reports errors', () => {
        const { fs } = create({ '/a': 'x', '/d/f': 'y' })

        expect(codeOf(() => fs.copyFileSync('/missing', '/b'))).toBe('ENOENT')
        expect(codeOf(() => fs.copyFileSync('/d', '/b'))).toBe('EISDIR')
        expect(codeOf(() => fs.copyFileSync('/a', '/d'))).toBe('EISDIR')
        expect(codeOf(() => fs.copyFileSync('/a', '/no/parent'))).toBe('ENOENT')
    })
})

describe('access / exists', () => {
    it('access passes for existing paths and fails for missing ones', () => {
        const { fs } = create({ '/a': 'x' })

        expect(() => fs.accessSync('/a')).not.toThrow()
        expect(codeOf(() => fs.accessSync('/missing'))).toBe('ENOENT')
    })

    it('existsSync never throws', () => {
        const { fs } = create({ '/a': 'x' })

        expect(fs.existsSync('/a')).toBe(true)
        expect(fs.existsSync('/nope')).toBe(false)
    })
})

describe('async API', () => {
    it('mirrors the sync API over the same state', async () => {
        const { fs } = create()
        await fs.mkdir('/a/b', { recursive: true })
        await fs.writeFile('/a/b/f.txt', 'one')
        await fs.appendFile('/a/b/f.txt', ' two')
        await fs.copyFile('/a/b/f.txt', '/a/copy.txt')
        await fs.rename('/a/copy.txt', '/a/moved.txt')
        await fs.access('/a/moved.txt')

        expect(await fs.readFile('/a/b/f.txt', 'utf8')).toBe('one two')
        expect(await fs.readFile('/a/moved.txt')).toEqual(Buffer.from('one two'))
        expect(await fs.readdir('/a')).toEqual(['b', 'moved.txt'])
        expect((await fs.stat('/a/b')).isDirectory()).toBe(true)
        expect((await fs.lstat('/a/moved.txt')).isFile()).toBe(true)
        expect(fs.readFileSync('/a/moved.txt', 'utf8')).toBe('one two')

        await fs.rm('/a', { recursive: true })
        expect(fs.existsSync('/a')).toBe(false)
    })

    it('rejects with Node-style errors', async () => {
        const { fs } = create()

        await expect(fs.readFile('/missing')).rejects.toMatchObject({ code: 'ENOENT' })
        await expect(fs.readFile('/missing', 'utf8')).rejects.toBeInstanceOf(FsError)
    })
})
