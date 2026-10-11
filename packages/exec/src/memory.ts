import { CallHistory } from '@starframe-dev/ts-mocks-core'
import type { Exec, ExecOptions, ExecResult } from './contract.js'
import { CommandNotFoundError } from './errors.js'

export type ArgsMatcher = (args: readonly string[], options: ExecOptions) => boolean
export type PartialResult = Partial<ExecResult>
export type ResultProvider = (args: readonly string[], options: ExecOptions) => PartialResult

export interface RecordedCommand {
    readonly command: string
    readonly args: readonly string[]
    readonly options: ExecOptions
}

interface Route {
    readonly command: string
    readonly matches: ArgsMatcher
    readonly respond: ResultProvider
}

const SUCCESS = 0

function sameArgs(expected: readonly string[], actual: readonly string[]): boolean {
    return expected.length === actual.length && expected.every((arg, index) => arg === actual[index])
}

/** Answers commands from registered results; the first matching registration wins. */
export class MemoryExec implements Exec {
    private readonly routes: Route[] = []
    private readonly calls = new CallHistory<[RecordedCommand]>()

    /**
     * Registers a result for a command.
     * `args` is either the exact argument list or a matcher function.
     * Omitted result fields default to exit code 0 and empty output.
     */
    register(command: string, args: readonly string[] | ArgsMatcher, result: PartialResult | ResultProvider): void {
        this.routes.push({
            command,
            matches: typeof args === 'function' ? args : (actual) => sameArgs(args, actual),
            respond: typeof result === 'function' ? result : () => result,
        })
    }

    async run(command: string, args: readonly string[] = [], options: ExecOptions = {}): Promise<ExecResult> {
        this.calls.record([{ command, args: [...args], options }])
        const route = this.routes.find((candidate) => candidate.command === command && candidate.matches(args, options))
        if (route === undefined) throw new CommandNotFoundError(command, args)
        const { code = SUCCESS, stdout = '', stderr = '' } = route.respond(args, options)
        return { code, stdout, stderr }
    }

    history(): readonly RecordedCommand[] {
        return this.calls.calls().map((call) => call.args[0])
    }

    reset(): void {
        this.calls.reset()
    }
}
