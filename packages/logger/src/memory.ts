import type { LogFields, Logger, LogLevel } from './contract.js'

export interface LogEntry {
    readonly level: LogLevel
    readonly message: string
    readonly fields?: LogFields
}

/** Logger that keeps every entry in memory for assertions. */
export class MemoryLogger implements Logger {
    private readonly log: LogEntry[] = []

    debug(message: string, fields?: LogFields): void {
        this.add('debug', message, fields)
    }

    info(message: string, fields?: LogFields): void {
        this.add('info', message, fields)
    }

    warn(message: string, fields?: LogFields): void {
        this.add('warn', message, fields)
    }

    error(message: string, fields?: LogFields): void {
        this.add('error', message, fields)
    }

    entries(): readonly LogEntry[] {
        return [...this.log]
    }

    byLevel(level: LogLevel): readonly LogEntry[] {
        return this.log.filter((entry) => entry.level === level)
    }

    reset(): void {
        this.log.length = 0
    }

    private add(level: LogLevel, message: string, fields?: LogFields): void {
        this.log.push(fields === undefined ? { level, message } : { level, message, fields })
    }
}
