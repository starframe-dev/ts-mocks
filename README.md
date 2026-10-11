# ts-mocks

Фундаментальная библиотека моков для TypeScript: всё внешнее (файловая система, сеть, время, случайность, окружение, процессы, логи, браузерные API) подменяется детерминированными in-memory реализациями.

| Пакет | Что мокает | Основной экспорт |
|-------|------------|------------------|
| `@starframe-dev/ts-mocks-core` | общая история вызовов | `CallHistory` |
| `@starframe-dev/ts-mocks-clock` | время и таймеры | `FakeClock`, `systemClock` |
| `@starframe-dev/ts-mocks-random` | случайность | `SeededRandom` |
| `@starframe-dev/ts-mocks-env` | переменные окружения | `MemoryEnv` |
| `@starframe-dev/ts-mocks-logger` | логи | `MemoryLogger` |
| `@starframe-dev/ts-mocks-fs` | `node:fs` (async и sync) | `MemoryFS` |
| `@starframe-dev/ts-mocks-net` | `fetch` | `createMockFetch`, `createMemoryNet` |
| `@starframe-dev/ts-mocks-exec` | запуск процессов | `MemoryExec` |
| `@starframe-dev/ts-mocks-browser` | storage, location, history, WebSocket, EventSource, matchMedia, observers, clipboard, navigator | `MemoryStorage`, `MockWebSocket`, … |

Каждый пакет: контракт (`contract.ts`), реализация и тесты. Зависимости подставляются через внедрение: контракт принимается там, где раньше использовался глобальный API.

```ts
import { FakeClock } from '@starframe-dev/ts-mocks-clock'
import { MemoryFS } from '@starframe-dev/ts-mocks-fs'

const clock = new FakeClock(1000)
const fs = new MemoryFS(clock, { '/app/config.json': '{}' })

await fs.writeFile('/app/log.txt', 'hello')
fs.readFileSync('/app/log.txt', 'utf8') // 'hello'
```

## Разработка

Только `pnpm`. Node ≥ 20.

```bash
pnpm install
pnpm build       # сборка всех пакетов
pnpm test        # тесты с покрытием (порог 90%)
pnpm typecheck
pnpm lint
```

Спецификация: [ts-mocks.md](ts-mocks.md).
