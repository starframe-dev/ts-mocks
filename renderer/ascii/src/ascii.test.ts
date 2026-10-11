import { describe, it, expect } from "vitest";
import {
  createBox,
  createAsciiRenderer,
  createLayoutRenderer,
  Box,
  Layout,
} from "./index";

describe("AsciiRenderer", () => {
  const r = createAsciiRenderer(20, "default");

  it("renders box with default border", () => {
    const box = createBox(["hello", "world"]).withPadding(1);
    const lines = r.render(box);

    // Width = max(5+2, 5+2) + 2*1 = 9
    expect(lines[0]).toContain("┌");
    expect(lines[0]).toContain("┐");
    expect(lines[3]).toContain("└");
    expect(lines[3]).toContain("┘");
    expect(lines[1]).toContain("hello");
    expect(lines[2]).toContain("world");
  });

  it("renders box with title", () => {
    const box = createBox(["content"], { title: "Title" });
    const lines = r.render(box);

    expect(lines[0]).toContain("Title");
    expect(lines[0]).toContain("┌");
    expect(lines[0]).toContain("┐");
  });

  it("renders simple border", () => {
    const r2 = createAsciiRenderer(10, "simple");
    const lines = r2.render(createBox(["hi"]));

    expect(lines[0]).toContain("+");
    expect(lines[1]).toContain("|");
  });

  it("renders double border", () => {
    const r2 = createAsciiRenderer(10, "double");
    const lines = r2.render(createBox(["hi"]));

    expect(lines[0]).toContain("╔");
    expect(lines[0]).toContain("╗");
    expect(lines[2]).toContain("╚");
    expect(lines[2]).toContain("╝");
  });

  it("renders string array directly", () => {
    const lines = r.render(["a", "b", "c"]);
    expect(lines).toEqual(["a", "b", "c"]);
  });

  it("renders box with minWidth", () => {
    const r2 = createAsciiRenderer(80);
    const box = createBox(["hi"], { minWidth: 20 });
    const lines = r2.render(box);

    expect(lines[0].length).toBeGreaterThanOrEqual(20);
  });
});

describe("LayoutRenderer", () => {
  const r = createLayoutRenderer(20);

  it("renders layout with two columns", () => {
    const layout = new Layout()
      .addRow(createBox(["A"]), createBox(["B"]))
      .addRow(createBox(["C"]), createBox(["D"]));

    const lines = r.render(layout);

    // Should have rows with separators
    expect(lines.some((l) => l.includes("┌"))).toBe(true);
    expect(lines.some((l) => l.includes("│"))).toBe(true);
    // Should have separator between rows
    expect(lines.some((l) => l.includes("─"))).toBe(true);
  });
});
