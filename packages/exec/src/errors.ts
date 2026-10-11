/** Rejection for a command that has no registered result. */
export class CommandNotFoundError extends Error {
    constructor(
        readonly command: string,
        readonly args: readonly string[],
    ) {
        super(`Command not registered: ${[command, ...args].join(' ')}`)
        this.name = 'CommandNotFoundError'
    }
}
