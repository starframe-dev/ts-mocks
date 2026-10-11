import type { Scene, Camera } from "three";
import type { ThreeJsMock } from "./index";
import { toSvg, toAscii, inspect } from "./to-svg";

export function createThreeJsMock(): ThreeJsMock {
  return {
    toSvg(scene: Scene, camera?: Camera): string {
      return toSvg(scene, camera);
    },
    toAscii(scene: Scene, camera?: Camera): string {
      return toAscii(scene, camera);
    },
    inspect(scene: Scene) {
      return inspect(scene);
    },
  };
}
