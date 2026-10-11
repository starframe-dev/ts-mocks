export interface SvgOptions {
  width: number;
  height: number;
  viewBox?: string;
}

export interface SvgElement {
  toSvg(indent?: number): string;
}

export class Rect implements SvgElement {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public fill = "none",
    public stroke = "black",
    public strokeWidth = 1
  ) {}

  toSvg(indent = 0): string {
    const ind = "  ".repeat(indent);
    return `${ind}<rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" fill="${this.fill}" stroke="${this.stroke}" stroke-width="${this.strokeWidth}" />`;
  }
}

export class Circle implements SvgElement {
  constructor(
    public cx: number,
    public cy: number,
    public r: number,
    public fill = "none",
    public stroke = "black",
    public strokeWidth = 1
  ) {}

  toSvg(indent = 0): string {
    const ind = "  ".repeat(indent);
    return `${ind}<circle cx="${this.cx}" cy="${this.cy}" r="${this.r}" fill="${this.fill}" stroke="${this.stroke}" stroke-width="${this.strokeWidth}" />`;
  }
}

export class Line implements SvgElement {
  constructor(
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
    public stroke = "black",
    public strokeWidth = 1
  ) {}

  toSvg(indent = 0): string {
    const ind = "  ".repeat(indent);
    return `${ind}<line x1="${this.x1}" y1="${this.y1}" x2="${this.x2}" y2="${this.y2}" stroke="${this.stroke}" stroke-width="${this.strokeWidth}" />`;
  }
}

export class Text implements SvgElement {
  constructor(
    public x: number,
    public y: number,
    public content: string,
    public fontSize = 12,
    public fill = "black"
  ) {}

  toSvg(indent = 0): string {
    const ind = "  ".repeat(indent);
    return `${ind}<text x="${this.x}" y="${this.y}" font-size="${this.fontSize}" fill="${this.fill}">${this.content}</text>`;
  }
}

export class Path implements SvgElement {
  constructor(
    public d: string,
    public fill = "none",
    public stroke = "black",
    public strokeWidth = 1
  ) {}

  toSvg(indent = 0): string {
    const ind = "  ".repeat(indent);
    return `${ind}<path d="${this.d}" fill="${this.fill}" stroke="${this.stroke}" stroke-width="${this.strokeWidth}" />`;
  }
}

export class Group implements SvgElement {
  constructor(public transform: string, public children: SvgElement[] = []) {}

  add(...elements: SvgElement[]): this {
    this.children.push(...elements);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, fill?: string, stroke?: string): this {
    return this.add(new Rect(x, y, w, h, fill, stroke));
  }

  circle(cx: number, cy: number, r: number, fill?: string, stroke?: string): this {
    return this.add(new Circle(cx, cy, r, fill, stroke));
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke?: string): this {
    return this.add(new Line(x1, y1, x2, y2, stroke));
  }

  text(x: number, y: number, content: string, fontSize?: number): this {
    return this.add(new Text(x, y, content, fontSize));
  }

  toSvg(indent = 0): string {
    const ind = "  ".repeat(indent);
    const attrs = this.transform ? ` transform="${this.transform}"` : "";
    const children = this.children.map((c) => c.toSvg(indent + 1)).join("\n");
    return `${ind}<g${attrs}>\n${children}\n${ind}</g>`;
  }
}

export class Polyline implements SvgElement {
  constructor(
    public points: { x: number; y: number }[] = [],
    public fill = "none",
    public stroke = "black",
    public strokeWidth = 1
  ) {}

  toSvg(indent = 0): string {
    const ind = "  ".repeat(indent);
    const pointsStr = this.points.map((p) => `${p.x},${p.y}`).join(" ");
    return `${ind}<polyline points="${pointsStr}" fill="${this.fill}" stroke="${this.stroke}" stroke-width="${this.strokeWidth}" />`;
  }
}

export class SVG {
  private elements: SvgElement[] = [];

  constructor(private width: number, private height: number, private viewBox?: string) {}

  add(element: SvgElement): this {
    this.elements.push(element);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, fill?: string, stroke?: string): this {
    return this.add(new Rect(x, y, w, h, fill, stroke));
  }

  circle(cx: number, cy: number, r: number, fill?: string, stroke?: string): this {
    return this.add(new Circle(cx, cy, r, fill, stroke));
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke?: string): this {
    return this.add(new Line(x1, y1, x2, y2, stroke));
  }

  text(x: number, y: number, content: string, fontSize?: number): this {
    return this.add(new Text(x, y, content, fontSize));
  }

  group(transform: string, fn?: (g: Group) => void): this {
    const g = new Group(transform);
    if (fn) fn(g);
    this.add(g);
    return this;
  }

  toString(): string {
    const vb = this.viewBox ?? `0 0 ${this.width} ${this.height}`;
    const children = this.elements.map((e) => e.toSvg(1)).join("\n");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="${vb}">\n${children}\n</svg>`;
  }
}

export function createSvg(width: number, height: number, viewBox?: string): SVG {
  return new SVG(width, height, viewBox);
}
