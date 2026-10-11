import { MockClipboard } from './clipboard.js'
import { GlobalInstaller } from './internal/global.js'

const DEFAULT_LANGUAGE = 'en-US'
const DEFAULT_USER_AGENT = 'ts-mocks'

export interface NavigatorInit {
    readonly onLine?: boolean
    readonly language?: string
    readonly languages?: readonly string[]
    readonly userAgent?: string
    readonly clipboard?: MockClipboard
    /** Also receives `online` / `offline` events (browsers dispatch them on `window`). */
    readonly windowTarget?: EventTarget
}

/** `navigator` with settable connectivity; fires `online` and `offline` events. */
export class MockNavigator extends EventTarget {
    readonly language: string
    readonly languages: readonly string[]
    readonly userAgent: string
    readonly clipboard: MockClipboard
    private online: boolean
    private readonly windowTarget: EventTarget | undefined
    private readonly globals = new GlobalInstaller()

    constructor(init: NavigatorInit = {}) {
        super()
        this.online = init.onLine ?? true
        this.language = init.language ?? DEFAULT_LANGUAGE
        this.languages = init.languages ?? [this.language]
        this.userAgent = init.userAgent ?? DEFAULT_USER_AGENT
        this.clipboard = init.clipboard ?? new MockClipboard()
        this.windowTarget = init.windowTarget
    }

    get onLine(): boolean {
        return this.online
    }

    /** Changes connectivity and fires `online` / `offline` when it differs. */
    setOnLine(value: boolean): void {
        if (value === this.online) return
        this.online = value
        const type = value ? 'online' : 'offline'
        this.dispatchEvent(new Event(type))
        this.windowTarget?.dispatchEvent(new Event(type))
    }

    install(): void {
        this.globals.install('navigator', this)
    }

    uninstall(): void {
        this.globals.uninstall()
    }
}
