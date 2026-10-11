/** Replaces `target[key]` and returns a function that restores the original. */
export function patch(target: object, key: string, value: unknown): () => void {
    const original = Object.getOwnPropertyDescriptor(target, key)
    Object.defineProperty(target, key, {
        value,
        configurable: true,
        writable: true,
        enumerable: original?.enumerable ?? true,
    })
    return () => {
        if (original === undefined) Reflect.deleteProperty(target, key)
        else Object.defineProperty(target, key, original)
    }
}

/** Tracks patches so they can be undone together, newest first. */
export class GlobalInstaller {
    private restorers: (() => void)[] = []

    install(key: string, value: unknown, target: object = globalThis): void {
        this.restorers.push(patch(target, key, value))
    }

    uninstall(): void {
        for (const restore of this.restorers.reverse()) restore()
        this.restorers = []
    }
}
