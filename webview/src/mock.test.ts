import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockWebView,
  MockWebView,
} from "./mock";
import {
  createInMemoryWebView,
  InMemoryWebView,
  RealWebView,
} from "./test-webview";

describe("MockWebView", () => {
  let webview: MockWebView;

  beforeEach(() => {
    webview = createMockWebView();
  });

  it("renders component", () => {
    const view = webview.render("button");
    expect(view.html).toBe("<button />");
  });

  it("renders different components", () => {
    expect(webview.render("div").html).toBe("<div />");
    expect(webview.render("input").html).toBe("<input />");
  });

  it("reads current view", () => {
    webview.render("div");
    expect(webview.read().html).toBe("<div />");
  });

  it("loads url", async () => {
    const view = await webview.load("https://example.com");
    expect(view.html).toContain("example.com");
  });

  it("interact does not throw", async () => {
    await expect(
      webview.interact({ type: "click", target: "#btn" })
    ).resolves.toBeUndefined();
  });
});

describe("InMemoryWebView", () => {
  let webview: InMemoryWebView;

  beforeEach(() => {
    webview = createInMemoryWebView();
  });

  it("renders with custom renderer", () => {
    webview.setOnRender((component) => ({
      html: `<custom-${component}>...</custom-${component}>`,
    }));

    const view = webview.render("button");
    expect(view.html).toBe("<custom-button>...</custom-button>");
  });

  it("renders with default", () => {
    const view = webview.render("span");
    expect(view.html).toBe("<span />");
  });

  it("tracks history on interact", async () => {
    await webview.interact({ type: "click", target: "#a" });
    await webview.interact({ type: "input", target: "#b", payload: "hello" });

    expect(webview.history).toHaveLength(2);
    expect(webview.history[0]).toEqual({ type: "click", target: "#a" });
    expect(webview.history[1]).toEqual({
      type: "input",
      target: "#b",
      payload: "hello",
    });
  });

  it("tracks history on execute", async () => {
    await webview.execute("click #btn");

    expect(webview.history).toHaveLength(1);
    expect(webview.history[0]).toEqual({
      type: "click",
      target: "click #btn",
    });
  });

  it("supports custom interact handler", async () => {
    let called = false;
    webview.setOnInteract(async (action) => {
      called = true;
    });

    await webview.interact({ type: "scroll", target: "#main" });
    expect(called).toBe(true);
  });

  it("loads url", async () => {
    const view = await webview.load("https://test.com");
    expect(view.html).toContain("test.com");
  });

  it("read returns current view", () => {
    webview.render("custom");
    expect(webview.read().html).toBe("<custom />");
  });
});

describe("RealWebView", () => {
  it("creates instance", () => {
    const webview = new RealWebView({});
    expect(webview).toBeDefined();
  });

  it("execute tracks history", async () => {
    const webview = new RealWebView({});
    await webview.execute("test");

    expect(webview.history).toHaveLength(1);
  });
});
