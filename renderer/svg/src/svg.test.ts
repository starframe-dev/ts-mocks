import { describe, it, expect } from "vitest";
import { createSvg, Rect, Circle, Line, Text, Group, Polyline } from "./index";

describe("SVG", () => {
  it("creates basic SVG", () => {
    const svg = createSvg(100, 100);
    const out = svg.toString();

    expect(out).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(out).toContain('width="100"');
    expect(out).toContain('height="100"');
    expect(out).toContain("</svg>");
  });

  it("adds rect", () => {
    const svg = createSvg(100, 100).rect(10, 10, 50, 30, "red", "black");
    const out = svg.toString();

    expect(out).toContain('<rect x="10" y="10" width="50" height="30" fill="red" stroke="black"');
  });

  it("adds circle", () => {
    const svg = createSvg(100, 100).circle(50, 50, 20, "blue");
    expect(svg.toString()).toContain('<circle cx="50" cy="50" r="20" fill="blue"');
  });

  it("adds line", () => {
    const svg = createSvg(100, 100).line(0, 0, 100, 100, "green");
    expect(svg.toString()).toContain('<line x1="0" y1="0" x2="100" y2="100" stroke="green"');
  });

  it("adds text", () => {
    const svg = createSvg(100, 100).text(10, 20, "Hello", 14, "black");
    expect(svg.toString()).toContain('<text x="10" y="20" font-size="14" fill="black">Hello</text>');
  });

  it("adds group with transform", () => {
    const svg = createSvg(100, 100);
    svg.group("translate(10,10)", (g) => {
      g.rect(0, 0, 10, 10);
    });
    const out = svg.toString();

    expect(out).toContain('<g transform="translate(10,10)">');
    expect(out).toContain("</g>");
  });

  it("adds polyline", () => {
    const svg = createSvg(100, 100).add(
      new Polyline([{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }])
    );
    expect(svg.toString()).toContain("0,0 50,50 100,0");
  });
});
