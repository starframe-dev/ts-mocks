import { fileURLToPath } from 'node:url'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import type { ViteUserConfig } from 'vitest/config'

const PACKAGES_DIR = fileURLToPath(new URL('./packages', import.meta.url))
const SCOPE = '@starframe-dev/ts-mocks-'
const COVERAGE_THRESHOLD = 90

function workspaceAliases(): Record<string, string> {
    const aliases: Record<string, string> = {}
    for (const name of readdirSync(PACKAGES_DIR)) {
        aliases[SCOPE + name] = join(PACKAGES_DIR, name, 'src', 'index.ts')
    }
    return aliases
}

/** Shared vitest config: resolves workspace packages to sources and enforces coverage. */
export function defineMockConfig(environment: 'node' | 'jsdom' = 'node'): ViteUserConfig {
    return defineConfig({
        resolve: { alias: workspaceAliases() },
        test: {
            environment,
            include: ['src/**/*.test.ts'],
            coverage: {
                provider: 'v8',
                include: ['src/**/*.ts'],
                exclude: ['src/**/*.test.ts', 'src/index.ts'],
                thresholds: {
                    lines: COVERAGE_THRESHOLD,
                    functions: COVERAGE_THRESHOLD,
                    branches: COVERAGE_THRESHOLD,
                    statements: COVERAGE_THRESHOLD,
                },
            },
        },
    })
}
