import type { Env, EnvVars } from './contract.js'

export class MemoryEnv implements Env {
    private readonly vars: Map<string, string>

    constructor(initial: EnvVars = {}) {
        this.vars = new Map(Object.entries(initial))
    }

    get(key: string): string | undefined {
        return this.vars.get(key)
    }

    set(key: string, value: string): void {
        this.vars.set(key, value)
    }

    delete(key: string): void {
        this.vars.delete(key)
    }

    all(): EnvVars {
        return Object.freeze(Object.fromEntries(this.vars))
    }
}
