export type EnvVars = Readonly<Record<string, string>>

/** Environment variables; inject it instead of reading `process.env`. */
export interface Env {
    get(key: string): string | undefined
    set(key: string, value: string): void
    delete(key: string): void
    /** A frozen snapshot of all variables. */
    all(): EnvVars
}
