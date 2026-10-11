import type { Scene, Camera } from "three";

export interface ThreeJsMock {
  /** Render the scene as SVG */
  toSvg(scene: Scene, camera?: Camera): string;

  /** Render the scene as ASCII art */
  toAscii(scene: Scene, camera?: Camera): string;

  /** List all objects in the scene */
  inspect(scene: Scene): SceneInfo[];
}

export interface SceneInfo {
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  visible: boolean;
}
