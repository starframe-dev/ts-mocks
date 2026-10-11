import { GlobalInstaller } from './internal/global.js'
import { MethodLog } from './internal/log.js'
import type { MethodHistory } from './internal/log.js'

/** In-memory `navigator.clipboard` (text only). */
export class MockClipboard extends EventTarget {
    private text: string
    private readonly log = new MethodLog()
    private readonly globals = new GlobalInstaller()

    constructor(initialText = '') {
        super()
        this.text = initialText
    }

    /** Current clipboard text, for assertions. */
    get content(): string {
        return this.text
    }

    async readText(): Promise<string> {
        this.log.record('readText')
        return this.text
    }

    async writeText(data: string): Promise<void> {
        this.log.record('writeText', data)
        this.text = String(data)
    }

    history(): MethodHistory {
        return this.log.history()
    }

    clearHistory(): void {
        this.log.clear()
    }

    /** Sets `navigator.clipboard`; a `navigator` must already exist (see `MockNavigator`). */
    install(): void {
        if (typeof navigator === 'undefined') {
            throw new Error('navigator is not defined: install MockNavigator first')
        }
        this.globals.install('clipboard', this, navigator)
    }

    uninstall(): void {
        this.globals.uninstall()
    }
}
