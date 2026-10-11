import { posix } from 'node:path'
import type { Clock } from '@starframe-dev/ts-mocks-clock'
import type {
    FileData,
    FileSystem,
    MakeDirectoryOptions,
    ReadEncoding,
    RmOptions,
    Stats,
    WriteEncoding,
} from './contract.js'
import { posixError, removeDirectoryError } from './errors.js'
import type { FsError, PosixCode } from './errors.js'

interface FileNode {
    readonly kind: 'file'
    data: Buffer
    mtimeMs: number
}

interface DirNode {
    readonly kind: 'dir'
    readonly children: Map<string, FsNode>
    mtimeMs: number
}

type FsNode = FileNode | DirNode

/** Where an operation happens; used to build errors the way Node does. */
interface OpContext {
    readonly syscall: string
    readonly path: string
    readonly dest?: string
}

const ROOT = '/'
const DEFAULT_ENCODING: BufferEncoding = 'utf8'

function segmentsOf(absolutePath: string): string[] {
    return absolutePath.split('/').filter((segment) => segment !== '')
}

function encodingOf(options: ReadEncoding | WriteEncoding | undefined): BufferEncoding | undefined {
    return typeof options === 'string' ? options : options?.encoding
}

function toBuffer(data: FileData, options: WriteEncoding | undefined): Buffer {
    return typeof data === 'string' ? Buffer.from(data, encodingOf(options) ?? DEFAULT_ENCODING) : Buffer.from(data)
}

function byName([a]: readonly [string, unknown], [b]: readonly [string, unknown]): number {
    return a < b ? -1 : a > b ? 1 : 0
}

/**
 * In-memory file system with POSIX paths. Relative paths resolve against `cwd`.
 * Symbolic links and permissions are not modelled.
 */
export class MemoryFS implements FileSystem {
    private readonly root: DirNode
    private readonly cwd: string

    constructor(
        private readonly clock: Pick<Clock, 'now'>,
        initial: Readonly<Record<string, FileData>> = {},
        cwd: string = ROOT,
    ) {
        if (!posix.isAbsolute(cwd)) {
            throw new RangeError(`cwd must be an absolute path: ${cwd}`)
        }
        this.cwd = posix.normalize(cwd)
        this.root = this.newDir()
        for (const [path, data] of Object.entries(initial)) {
            this.mkdirSync(posix.dirname(this.resolve(path)), { recursive: true })
            this.writeFileSync(path, data)
        }
    }

    /** Contents of all files as UTF-8 text, keyed by absolute path. */
    snapshot(): Record<string, string> {
        const files: Record<string, string> = {}
        const walk = (dir: DirNode, prefix: string): void => {
            for (const [name, child] of [...dir.children].sort(byName)) {
                const path = `${prefix}/${name}`
                if (child.kind === 'dir') walk(child, path)
                else files[path] = child.data.toString(DEFAULT_ENCODING)
            }
        }
        walk(this.root, '')
        return files
    }

    // ---- async API (thin wrappers over the sync one) ----

    readFile(path: string): Promise<Buffer>
    readFile(path: string, options: ReadEncoding): Promise<string>
    async readFile(path: string, options?: ReadEncoding): Promise<Buffer | string> {
        return options === undefined ? this.readFileSync(path) : this.readFileSync(path, options)
    }

    async writeFile(path: string, data: FileData, options?: WriteEncoding): Promise<void> {
        this.writeFileSync(path, data, options)
    }

    async appendFile(path: string, data: FileData, options?: WriteEncoding): Promise<void> {
        this.appendFileSync(path, data, options)
    }

    async mkdir(path: string, options?: MakeDirectoryOptions): Promise<string | undefined> {
        return this.mkdirSync(path, options)
    }

    async readdir(path: string): Promise<string[]> {
        return this.readdirSync(path)
    }

    async stat(path: string): Promise<Stats> {
        return this.statSync(path)
    }

    async lstat(path: string): Promise<Stats> {
        return this.lstatSync(path)
    }

    async rm(path: string, options?: RmOptions): Promise<void> {
        this.rmSync(path, options)
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        this.renameSync(oldPath, newPath)
    }

    async copyFile(src: string, dest: string): Promise<void> {
        this.copyFileSync(src, dest)
    }

    async access(path: string): Promise<void> {
        this.accessSync(path)
    }

    // ---- sync API ----

    readFileSync(path: string): Buffer
    readFileSync(path: string, options: ReadEncoding): string
    readFileSync(path: string, options?: ReadEncoding): Buffer | string {
        const ctx: OpContext = { syscall: 'open', path }
        const node = this.find(path, ctx)
        if (node === undefined) throw this.fail('ENOENT', ctx)
        if (node.kind === 'dir') throw posixError('EISDIR', 'read', undefined)
        const encoding = encodingOf(options)
        return encoding === undefined ? Buffer.from(node.data) : node.data.toString(encoding)
    }

    writeFileSync(path: string, data: FileData, options?: WriteEncoding): void {
        const ctx: OpContext = { syscall: 'open', path }
        const existing = this.find(path, ctx)
        if (existing?.kind === 'dir') throw this.fail('EISDIR', ctx)
        const content = toBuffer(data, options)
        if (existing !== undefined) {
            existing.data = content
            existing.mtimeMs = this.clock.now()
            return
        }
        const { dir, name } = this.parent(path, ctx)
        dir.children.set(name, { kind: 'file', data: content, mtimeMs: this.clock.now() })
        dir.mtimeMs = this.clock.now()
    }

    appendFileSync(path: string, data: FileData, options?: WriteEncoding): void {
        const ctx: OpContext = { syscall: 'open', path }
        const existing = this.find(path, ctx)
        if (existing?.kind === 'dir') throw this.fail('EISDIR', ctx)
        if (existing === undefined) {
            this.writeFileSync(path, data, options)
            return
        }
        existing.data = Buffer.concat([existing.data, toBuffer(data, options)])
        existing.mtimeMs = this.clock.now()
    }

    mkdirSync(path: string, options?: MakeDirectoryOptions): string | undefined {
        const ctx: OpContext = { syscall: 'mkdir', path }
        if (options?.recursive === true) return this.mkdirRecursive(path, ctx)
        if (this.find(path, ctx) !== undefined) throw this.fail('EEXIST', ctx)
        const { dir, name } = this.parent(path, ctx)
        dir.children.set(name, this.newDir())
        dir.mtimeMs = this.clock.now()
        return undefined
    }

    readdirSync(path: string): string[] {
        const ctx: OpContext = { syscall: 'scandir', path }
        const node = this.find(path, ctx)
        if (node === undefined) throw this.fail('ENOENT', ctx)
        if (node.kind === 'file') throw this.fail('ENOTDIR', ctx)
        return [...node.children.keys()].sort()
    }

    statSync(path: string): Stats {
        return this.statOf(path, 'stat')
    }

    lstatSync(path: string): Stats {
        return this.statOf(path, 'lstat')
    }

    rmSync(path: string, options?: RmOptions): void {
        const ctx: OpContext = { syscall: 'rm', path }
        const lookup: OpContext = { syscall: 'lstat', path }
        const node = this.find(path, lookup)
        if (node === undefined) {
            if (options?.force === true) return
            throw this.fail('ENOENT', lookup)
        }
        if (this.resolve(path) === ROOT) throw this.fail('EPERM', ctx)
        if (node.kind === 'dir' && options?.recursive !== true) throw removeDirectoryError(path)
        const { dir, name } = this.parent(path, ctx)
        dir.children.delete(name)
        dir.mtimeMs = this.clock.now()
    }

    renameSync(oldPath: string, newPath: string): void {
        const ctx: OpContext = { syscall: 'rename', path: oldPath, dest: newPath }
        const from = this.resolve(oldPath)
        const to = this.resolve(newPath)
        const source = this.find(from, ctx)
        if (source === undefined) throw this.fail('ENOENT', ctx)
        if (from === ROOT || to === ROOT) throw this.fail('EPERM', ctx)
        if (from === to) return
        if (source.kind === 'dir' && to.startsWith(`${from}/`)) throw this.fail('EINVAL', ctx)

        const origin = this.parent(from, ctx)
        const target = this.parent(to, ctx)
        const replaced = target.dir.children.get(target.name)
        if (replaced !== undefined) {
            if (source.kind === 'file' && replaced.kind === 'dir') throw this.fail('EISDIR', ctx)
            if (source.kind === 'dir' && replaced.kind === 'file') throw this.fail('ENOTDIR', ctx)
            if (replaced.kind === 'dir' && replaced.children.size > 0) throw this.fail('ENOTEMPTY', ctx)
        }
        origin.dir.children.delete(origin.name)
        target.dir.children.set(target.name, source)
        origin.dir.mtimeMs = this.clock.now()
        target.dir.mtimeMs = this.clock.now()
    }

    copyFileSync(src: string, dest: string): void {
        const ctx: OpContext = { syscall: 'copyfile', path: src, dest }
        const source = this.find(src, ctx)
        if (source === undefined) throw this.fail('ENOENT', ctx)
        if (source.kind === 'dir') throw this.fail('EISDIR', ctx)
        const existing = this.find(dest, ctx)
        if (existing?.kind === 'dir') throw this.fail('EISDIR', ctx)
        const data = Buffer.from(source.data)
        if (existing !== undefined) {
            existing.data = data
            existing.mtimeMs = this.clock.now()
            return
        }
        const { dir, name } = this.parent(dest, ctx)
        dir.children.set(name, { kind: 'file', data, mtimeMs: this.clock.now() })
        dir.mtimeMs = this.clock.now()
    }

    accessSync(path: string): void {
        const ctx: OpContext = { syscall: 'access', path }
        if (this.find(path, ctx) === undefined) throw this.fail('ENOENT', ctx)
    }

    existsSync(path: string): boolean {
        try {
            return this.find(path, { syscall: 'access', path }) !== undefined
        } catch {
            return false
        }
    }

    // ---- internals ----

    private newDir(): DirNode {
        return { kind: 'dir', children: new Map(), mtimeMs: this.clock.now() }
    }

    private fail(code: PosixCode, ctx: OpContext): FsError {
        return posixError(code, ctx.syscall, ctx.path, ctx.dest)
    }

    private resolve(path: string): string {
        return posix.resolve(this.cwd, path)
    }

    /** Finds a node; throws ENOTDIR when the path goes through a file. */
    private find(path: string, ctx: OpContext): FsNode | undefined {
        let node: FsNode = this.root
        for (const name of segmentsOf(this.resolve(path))) {
            if (node.kind === 'file') throw this.fail('ENOTDIR', ctx)
            const next = node.children.get(name)
            if (next === undefined) return undefined
            node = next
        }
        return node
    }

    /** Finds the directory that will contain `path`. */
    private parent(path: string, ctx: OpContext): { dir: DirNode; name: string } {
        const absolute = this.resolve(path)
        const dir = this.find(posix.dirname(absolute), ctx)
        if (dir === undefined) throw this.fail('ENOENT', ctx)
        if (dir.kind === 'file') throw this.fail('ENOTDIR', ctx)
        return { dir, name: posix.basename(absolute) }
    }

    private mkdirRecursive(path: string, ctx: OpContext): string | undefined {
        const absolute = this.resolve(path)
        let node = this.root
        let current = ''
        let first: string | undefined
        for (const name of segmentsOf(absolute)) {
            current += `/${name}`
            const next = node.children.get(name)
            if (next === undefined) {
                const created = this.newDir()
                node.children.set(name, created)
                node.mtimeMs = this.clock.now()
                first ??= current
                node = created
            } else if (next.kind === 'dir') {
                node = next
            } else {
                throw this.fail(current === absolute ? 'EEXIST' : 'ENOTDIR', ctx)
            }
        }
        return first
    }

    private statOf(path: string, syscall: string): Stats {
        const ctx: OpContext = { syscall, path }
        const node = this.find(path, ctx)
        if (node === undefined) throw this.fail('ENOENT', ctx)
        const isFile = node.kind === 'file'
        return {
            size: node.kind === 'file' ? node.data.length : 0,
            mtimeMs: node.mtimeMs,
            isFile: () => isFile,
            isDirectory: () => !isFile,
        }
    }
}
