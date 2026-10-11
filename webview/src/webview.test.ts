import { describe, it, expect } from "vitest";
import { createMockWebView } from "./mock";
import { createInMemoryWebView } from "./test-webview";

describe("MockWebView", () => {
  it("renders component", () => {
    const webview = createMockWebView();
    const view = webview.render("button");

    expect(view.html).toBe("<button />");
  });

  it("reads current view", () => {
    const webview = createMockWebView();
    webview.render("div");

    expect(webview.read().html).toBe("<div />");
  });
});

describe("InMemoryWebView", () => {
  it("tracks history", async () => {
    const webview = createInMemoryWebView();
    await webview.interact({ type: "click", target: "#btn" });

    expect(webview.history).toContainEqual({
      type: "click",
      target: "#btn",
    });
  });
});
