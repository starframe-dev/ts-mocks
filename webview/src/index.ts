export interface View {
  html: string;
  title?: string;
}

export interface WebView {
  load(url: string): Promise<View>;
  render(component: string): View;
  read(): View;
  interact(action: Action): Promise<void>;
}

export interface Action {
  type: "click" | "input" | "scroll" | "select";
  target: string;
  payload?: string;
}

export interface TestWebView extends WebView {
  execute(cmd: string): Promise<View>;
  history(): Action[];
}
