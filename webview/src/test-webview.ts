import type { TestWebView, View, Action } from "./index";

export class InMemoryWebView implements TestWebView {
  private view: View = { html: "" };
  private history: Action[] = [];
  private onRender?: (component: string) => View;
  private onInteract?: (action: Action) => Promise<void>;

  constructor() {
    this.view = { html: "<body></body>", title: "Test" };
  }

  async load(url: string): Promise<View> {
    this.view = { html: `<html><body>${url}</body></html>` };
    return this.view;
  }

  render(component: string): View {
    this.view = this.onRender
      ? this.onRender(component)
      : { html: `<${component} />` };
    return this.view;
  }

  read(): View {
    return this.view;
  }

  async interact(action: Action): Promise<void> {
    this.history.push(action);
    if (this.onInteract) {
      await this.onInteract(action);
    }
  }

  async execute(cmd: string): Promise<View> {
    this.history.push({ type: "click", target: cmd });
    return this.view;
  }

  history(): Action[] {
    return [...this.history];
  }

  setOnRender(fn: (component: string) => View): void {
    this.onRender = fn;
  }

  setOnInteract(fn: (action: Action) => Promise<void>): void {
    this.onInteract = fn;
  }
}

export class RealWebView implements TestWebView {
  private view: View = { html: "" };
  private history: Action[] = [];
  private browser: unknown;

  constructor(browser: unknown) {
    this.browser = browser;
  }

  async load(url: string): Promise<View> {
    // TODO: launch real browser
    this.view = { html: `<html><body>${url}</body></html>` };
    return this.view;
  }

  render(component: string): View {
    this.view = { html: `<${component} />` };
    return this.view;
  }

  read(): View {
    return this.view;
  }

  async interact(action: Action): Promise<void> {
    this.history.push(action);
    // TODO: send to real browser
  }

  async execute(cmd: string): Promise<View> {
    this.history.push({ type: "click", target: cmd });
    return this.view;
  }

  history(): Action[] {
    return [...this.history];
  }
}

export function createInMemoryWebView(): InMemoryWebView {
  return new InMemoryWebView();
}
