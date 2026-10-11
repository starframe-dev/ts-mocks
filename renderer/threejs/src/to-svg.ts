import type { Scene, Camera, Object3D } from "three";
import type { SceneInfo } from "./index";

function collectObjects(obj: Object3D): SceneInfo[] {
  const info: SceneInfo[] = [];
  if (obj.position) {
    info.push({
      name: obj.name || obj.type,
      type: obj.type,
      position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
      visible: obj.visible,
    });
  }
  const children = (obj as any).children;
  if (children && Array.isArray(children)) {
    for (const child of children) {
      info.push(...collectObjects(child));
    }
  }
  return info;
}

function getColor(obj: Object3D): string {
  const mesh = obj as any;
  if (mesh.material?.color?.getStyle) {
    return mesh.material.color.getStyle();
  }
  return "#ccc";
}

function svgForObject(obj: Object3D): string {
  const p = obj.position;
  const s = obj.scale;

  if (obj.type === "Mesh") {
    const mesh = obj as any;
    const geo = mesh.geometry;
    const color = getColor(obj);

    if (geo?.type === "BoxGeometry") {
      const w = (geo.parameters?.width ?? 1) * s.x;
      const h = (geo.parameters?.height ?? 1) * s.y;
      return `<rect x="${p.x - w / 2}" y="${p.y - h / 2}" width="${w}" height="${h}" fill="${color}" stroke="black" />`;
    }
    if (geo?.type === "SphereGeometry") {
      const r = (geo.parameters?.radius ?? 1) * s.x;
      return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${color}" stroke="black" />`;
    }
    if (geo?.type === "PlaneGeometry") {
      const w = (geo.parameters?.width ?? 1) * s.x;
      const h = (geo.parameters?.height ?? 1) * s.y;
      return `<rect x="${p.x - w / 2}" y="${p.y - h / 2}" width="${w}" height="${h}" fill="none" stroke="black" stroke-dasharray="4" />`;
    }
    return `<rect x="${p.x - 5}" y="${p.y - 5}" width="10" height="10" fill="orange" />`;
  }

  if (obj.type === "Group") {
    const children = obj.children.map((c) => svgForObject(c)).join("\n");
    return `<g transform="translate(${p.x}, ${p.y})">\n${children}\n</g>`;
  }

  return "";
}

export function toSvg(scene: Scene, _camera?: Camera): string {
  const elements = scene.children.map((c) => svgForObject(c)).filter(Boolean).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20">\n${elements}\n</svg>`;
}

export function toAscii(scene: Scene, _camera?: Camera): string {
  const info = collectObjects(scene);
  if (info.length === 0) return "▢ (empty scene)";

  const lines = info.map(
    (o) =>
      `  ${o.visible ? "■" : "□"} ${o.name} @ (${o.position.x.toFixed(1)}, ${o.position.y.toFixed(1)})`
  );

  return ["Scene:", ...lines].join("\n");
}

export function inspect(scene: Scene): SceneInfo[] {
  return collectObjects(scene);
}
