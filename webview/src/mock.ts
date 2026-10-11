import type { WebView, View, Action } from "./index"

export class MockWebView implements WebView {
    private _view: View = { html: "" }

    load(url: string): Promise<View> {
        this._view = { html: `<html><body>Loaded: ${url}</body></html>` }
        return Promise.resolve(this._view)
    }

    render(component: string): View {
        this._view = { html: `<${component} />` }
        return this._view
    }

    read(): View {
        return this._view
    }

    async interact(action: Action): Promise<void> {
        // mock implementation
    }
}

export function createMockWebView(): MockWebView {
    return new MockWebView()
}
