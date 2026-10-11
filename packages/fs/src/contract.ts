export type FileData = string | Uint8Array
export type ReadEncoding = BufferEncoding | { readonly encoding: BufferEncoding }
export type WriteEncoding = BufferEncoding | { readonly encoding?: BufferEncoding }

export interface Stats {
    readonly size: number
    readonly mtimeMs: number
    isFile(): boolean
    isDirectory(): boolean
}

export interface MakeDirectoryOptions {
    readonly recursive?: boolean
}

export interface RmOptions {
    readonly recursive?: boolean
    readonly force?: boolean
}

/**
 * Subset of `node:fs/promises` plus the synchronous counterparts from `node:fs`.
 * Async and sync methods work over the same state.
 */
export interface FileSystem {
    readFile(path: string): Promise<Buffer>
    readFile(path: string, options: ReadEncoding): Promise<string>
    writeFile(path: string, data: FileData, options?: WriteEncoding): Promise<void>
    appendFile(path: string, data: FileData, options?: WriteEncoding): Promise<void>
    /** With `recursive`, resolves to the first directory created (if any). */
    mkdir(path: string, options?: MakeDirectoryOptions): Promise<string | undefined>
    readdir(path: string): Promise<string[]>
    stat(path: string): Promise<Stats>
    lstat(path: string): Promise<Stats>
    rm(path: string, options?: RmOptions): Promise<void>
    rename(oldPath: string, newPath: string): Promise<void>
    copyFile(src: string, dest: string): Promise<void>
    access(path: string): Promise<void>

    readFileSync(path: string): Buffer
    readFileSync(path: string, options: ReadEncoding): string
    writeFileSync(path: string, data: FileData, options?: WriteEncoding): void
    appendFileSync(path: string, data: FileData, options?: WriteEncoding): void
    mkdirSync(path: string, options?: MakeDirectoryOptions): string | undefined
    readdirSync(path: string): string[]
    statSync(path: string): Stats
    lstatSync(path: string): Stats
    rmSync(path: string, options?: RmOptions): void
    renameSync(oldPath: string, newPath: string): void
    copyFileSync(src: string, dest: string): void
    accessSync(path: string): void
    existsSync(path: string): boolean
}
