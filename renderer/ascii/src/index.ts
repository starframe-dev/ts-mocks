export type BorderStyle = "default" | "simple" | "double";

interface BoxBorder {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
}

const BORDERS: Record<BorderStyle, BoxBorder> = {
  default: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
  },
  simple: {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
  },
  double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
  },
};

export interface BoxOptions {
  title?: string;
  padding?: number;
  border?: BorderStyle;
  minWidth?: number;
}

export class Box {
  constructor(
    public lines: string[],
    public options: BoxOptions = {}
  ) {}

  withTitle(title: string): Box {
    return new Box(this.lines, { ...this.options, title });
  }

  withPadding(padding: number): Box {
    return new Box(this.lines, { ...this.options, padding });
  }
}

export class AsciiRenderer {
  private width: number;
  private border: BoxBorder;

  constructor(width = 80, border: BorderStyle = "default") {
    this.width = width;
    this.border = BORDERS[border];
  }

  render(content: Box | string[] | string): string[] {
    if (content instanceof Box) {
      return this.renderBox(content);
    }
    if (Array.isArray(content)) {
      return content;
    }
    return [content];
  }

  private renderBox(box: Box): string[] {
    const { title, padding = 0 } = box.options;
    const lines = box.lines;
    const border = this.border;

    let maxLineWidth = 0;
    for (const line of lines) {
      if (line.length > maxLineWidth) maxLineWidth = line.length;
    }

    let titleWidth = title ? title.length + 2 : 0;
    let width = Math.max(maxLineWidth, titleWidth, box.options.minWidth ?? 0) + padding * 2;

    const result: string[] = [];

    // Top border
    if (title) {
      const pad = width - titleWidth;
      const leftPad = Math.floor(pad / 2);
      const rightPad = pad - leftPad;
      result.push(
        border.topLeft +
        border.horizontal +
        border.horizontal.repeat(leftPad) +
        " " + title + " " +
        border.horizontal.repeat(rightPad) +
        border.horizontal +
        border.topRight
      );
    } else {
      result.push(border.topLeft + border.horizontal.repeat(width) + border.topRight);
    }

    // Content
    const padStr = " ".repeat(padding);
    for (const line of lines) {
      result.push(border.vertical + padStr + line + padStr + border.vertical);
    }

    // Bottom border
    result.push(border.bottomLeft + border.horizontal.repeat(width) + border.bottomRight);

    return result;
  }
}

export class Layout {
  constructor(
    public rows: (Box | string[])[][] = [],
    public spacing = 1
  ) {}

  addRow(...items: (Box | string[])[]): this {
    this.rows.push(items);
    return this;
  }
}

export class LayoutRenderer {
  private ascii: AsciiRenderer;

  constructor(width = 80, border: BorderStyle = "default") {
    this.ascii = new AsciiRenderer(width, border);
  }

  render(layout: Layout): string[] {
    if (layout.rows.length === 0) return [];

    const { rows, spacing } = layout;
    const colCount = Math.max(...rows.map((r) => r.length));

    // Calculate column widths
    const colWidths: number[] = Array(colCount).fill(0);
    const renderedRows: string[][][] = [];

    for (const row of rows) {
      const rowRendered: string[][] = [];
      for (let i = 0; i < colCount; i++) {
        const item = row[i];
        const lines = item instanceof Box
          ? this.ascii.render(item)
          : Array.isArray(item) ? item : [item];
        rowRendered.push(lines);

        for (const line of lines) {
          if (line.length > colWidths[i]) colWidths[i] = line.length;
        }
      }
      renderedRows.push(rowRendered);
    }

    const result: string[] = [];
    const spacer = " ".repeat(spacing);

    for (let ri = 0; ri < renderedRows.length; ri++) {
      const row = renderedRows[ri];

      if (ri > 0) {
        // Row separator
        const sep = row.map((_, ci) => "─".repeat(colWidths[ci])).join(spacer);
        result.push(sep);
      }

      // Find max height for this row
      const maxHeight = Math.max(...row.map((lines) => lines.length));

      // Pad shorter boxes and output
      for (let li = 0; li < maxHeight; li++) {
        let line = "";
        for (let ci = 0; ci < row.length; ci++) {
          const lines = row[ci];
          const padded = lines[li] ?? " ".repeat(colWidths[ci]);
          if (ci > 0) line += spacer;
          line += padded;
          if (padded.length < colWidths[ci]) {
            line += " ".repeat(colWidths[ci] - padded.length);
          }
        }
        result.push(line);
      }
    }

    return result;
  }
}

export function createBox(lines: string[], options?: BoxOptions): Box {
  return new Box(lines, options);
}

export function createAsciiRenderer(width = 80, border: BorderStyle = "default"): AsciiRenderer {
  return new AsciiRenderer(width, border);
}

export function createLayoutRenderer(width = 80, border: BorderStyle = "default"): LayoutRenderer {
  return new LayoutRenderer(width, border);
}
