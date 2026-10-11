export interface ExecOptions {
    readonly cwd?: string
    readonly env?: Readonly<Record<string, string>>
    /** Text written to the process's stdin. */
    readonly input?: string
}

export interface ExecResult {
    readonly code: number
    readonly stdout: string
    readonly stderr: string
}

/** Runs external commands; inject it instead of using `child_process`. */
export interface Exec {
    /** Resolves with the exit code even when it is non-zero. */
    run(command: string, args?: readonly string[], options?: ExecOptions): Promise<ExecResult>
}
