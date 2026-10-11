import { constants } from 'node:os'

export type PosixCode = 'ENOENT' | 'EEXIST' | 'EISDIR' | 'ENOTDIR' | 'ENOTEMPTY' | 'EINVAL' | 'EPERM'

const DESCRIPTIONS: Readonly<Record<PosixCode, string>> = {
    ENOENT: 'no such file or directory',
    EEXIST: 'file already exists',
    EISDIR: 'illegal operation on a directory',
    ENOTDIR: 'not a directory',
    ENOTEMPTY: 'directory not empty',
    EINVAL: 'invalid argument',
    EPERM: 'operation not permitted',
}

/** Error shaped like the ones thrown by `node:fs`. */
export class FsError extends Error {
    constructor(
        message: string,
        readonly code: string,
        readonly errno: number,
        readonly syscall: string,
        readonly path?: string,
        readonly dest?: string,
    ) {
        super(message)
    }
}

/** Node reports errno as a negative number. */
function errnoOf(code: PosixCode): number {
    return -constants.errno[code]
}

/** Like Node, the path is omitted for errors raised on an open descriptor (e.g. reading a directory). */
export function posixError(code: PosixCode, syscall: string, path: string | undefined, dest?: string): FsError {
    const target = path === undefined ? '' : dest === undefined ? ` '${path}'` : ` '${path}' -> '${dest}'`
    return new FsError(`${code}: ${DESCRIPTIONS[code]}, ${syscall}${target}`, code, errnoOf(code), syscall, path, dest)
}

/**
 * `fs.rm` on a directory without `recursive` fails with this Node-specific code.
 * Node reports its errno as a positive number, unlike the POSIX errors.
 */
export function removeDirectoryError(path: string): FsError {
    return new FsError(
        `Path is a directory: rm returned EISDIR (is a directory) ${path}`,
        'ERR_FS_EISDIR',
        constants.errno.EISDIR,
        'rm',
        path,
    )
}
