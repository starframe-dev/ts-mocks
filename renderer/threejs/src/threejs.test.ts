import { describe, it, expect } from "vitest"
import { createThreeJsMock } from "./create"

// Mock scene builder — no real Three.js dependency needed for these tests
function mockScene(objects: any[]) {
    return {
        children: objects,
    } as any
}

function mockBox(name: string, x: number, y: number, color?: string) {
    return {
        name,
        type: "Mesh",
        position: { x, y, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        visible: true,
        geometry: { type: "BoxGeometry", parameters: { width: 2, height: 1 } },
        material: { color: { getStyle: () => color ?? "#ff0000" } },
    }
}

function mockSphere(name: string, x: number, y: number) {
    return {
        name,
        type: "Mesh",
        position: { x, y, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        visible: true,
        geometry: { type: "SphereGeometry", parameters: { radius: 0.5 } },
        material: { color: { getStyle: () => "#00ff00" } },
    }
}

describe("ThreeJsMock", () => {
    const mock = createThreeJsMock()

    it("renders SVG", () => {
        const scene = mockScene([mockBox("box1", 0, 0)])
        const svg = mock.toSvg(scene)

        expect(svg).toContain("<svg")
        expect(svg).toContain('fill="#ff0000"')
        expect(svg).toContain('width="2"')
        expect(svg).toContain('height="1"')
    })

    it("renders ASCII art", () => {
        const scene = mockScene([mockBox("cube", 1.5, -2.1)])
        const ascii = mock.toAscii(scene)

        expect(ascii).toContain("Scene:")
        expect(ascii).toContain("cube")
        expect(ascii).toContain("1.5")
        expect(ascii).toContain("-2.1")
    })

    it("renders empty scene", () => {
        const scene = mockScene([])
        expect(mock.toAscii(scene)).toBe("▢ (empty scene)")
    })

    it("inspects scene", () => {
        const scene = mockScene([mockBox("a", 0, 0), mockSphere("b", 1, 1)])
        const info = mock.inspect(scene)

        expect(info).toHaveLength(2)
        expect(info[0].name).toBe("a")
        expect(info[1].name).toBe("b")
    })
})
