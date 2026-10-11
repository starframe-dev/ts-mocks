# ts-mocks: фундаментальная библиотека моков для TypeScript

## Контекст

Репозиторий `ts-mocks` содержит 5 несвязанных пакетов (`fs`, `webview`, `renderer/*`) без общей структуры, контрактов, спеки и workspace. `fs` — самописный синхронный API, несовместимый с `node:fs`. Нишевые моки (`pi`, `opencode`) в фундаментальную библиотеку не входят. Эталон устройства — `go-mocks`: пакет на область, контракт, callback-мок и in-memory реализация, история вызовов.

## Цель

Создать с нуля pnpm-монорепозиторий фундаментальных моков для всего внешнего (ФС, сеть, время, случайность, окружение, процессы, логи). Каждый мок — drop-in замена стандартного API Node.js.

## Что изменится

Порядок: от фундамента к поверхности.

1. Удалить весь текущий код (`fs/`, `renderer/`, `webview/`). История остаётся в git.
2. Корень: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.shared.ts`, `eslint.config.js`, `.gitignore`, `README.md`.
3. `packages/core` — общие типы и `CallHistory<T>`.
4. `packages/clock`, `packages/random`, `packages/env`, `packages/logger`.
5. `packages/fs`, `packages/net`, `packages/exec`.
6. `packages/browser`.

## Детали реализации

### Общее

- Менеджер пакетов — только `pnpm`. Node ≥ 20, TypeScript `strict`, ESM.
- Стиль: 4 пробела, без точек с запятой, комментарии на английском, без `any`.
- Имя пакета: `@starframe-dev/ts-mocks-<name>`.
- Структура пакета: `src/contract.ts` (интерфейс), `src/memory.ts` (in-memory реализация), `src/mock.ts` (callback-мок, только где он осмысленен — `net`), `src/index.ts`, рядом `*.test.ts`.
- Соответствие контракту проверяется на этапе компиляции через `satisfies`.
- Мок без внешних зависимостей, кроме `core`. Время и случайность внутри моков не используются напрямую: берутся из `clock` и `random` через внедрение.

### `core`

```ts
export interface CallRecord<TArgs extends readonly unknown[]> {
    readonly args: TArgs
    readonly at: number
}

export class CallHistory<TArgs extends readonly unknown[]> {
    record(args: TArgs): void
    calls(): readonly CallRecord<TArgs>[]   // copy
    reset(): void
}
```

### `clock`

- Контракт `Clock`: `now(): number`, `setTimeout(fn, ms): TimerId`, `clearTimeout(id)`, `setInterval`, `clearInterval`.
- `FakeClock`: `advance(ms)` синхронно запускает таймеры по порядку срабатывания, `set(ms)`, `pending(): number`.

### `random`

- Контракт `Random`: `next(): number` (0 ≤ x < 1), `int(min, max)`, `uuid()`, `bytes(n)`.
- `SeededRandom(seed: number)` — детерминированный (mulberry32). Одинаковый seed даёт одинаковую последовательность.

### `env`

- Контракт `Env`: `get(key)`, `set(key, value)`, `delete(key)`, `all(): Readonly<Record<string, string>>`.
- `MemoryEnv(initial?)`.

### `logger`

- Контракт `Logger`: `debug|info|warn|error(message, fields?)`.
- `MemoryLogger`: `entries()`, `byLevel(level)`, `reset()`.

### `fs`

- Контракт — подмножество `node:fs/promises` и все синхронные аналоги `node:fs` (`readFileSync`, `writeFileSync`, `existsSync` и т.д.): `readFile`, `writeFile`, `appendFile`, `mkdir({ recursive })`, `readdir`, `stat`, `lstat`, `rm({ recursive, force })`, `rename`, `copyFile`, `access`. Async и sync работают над одним состоянием.
- Содержимое — `Buffer`; `readFile(path, 'utf8')` возвращает строку.
- Ошибки — `Error` с полями `code` (`ENOENT`, `EEXIST`, `EISDIR`, `ENOTDIR`, `ENOTEMPTY`), `errno`, `syscall`, `path`, как в Node.
- `stat` возвращает объект с методами `isFile()`, `isDirectory()`, полями `size`, `mtimeMs`; время берётся из `Clock`.
- `MemoryFS(clock, initial?: Record<string, string | Buffer>)`, `snapshot(): Record<string, string>`.

### `net`

- Контракт — `typeof fetch`.
- `MockFetch` с callback `handler(request: Request): Promise<Response>` и историей запросов.
- `MemoryNet`: `register(method, url, { status, body, headers })`, матчинг по методу и URL; запрос без регистрации — ошибка `NoRouteError`.

### `exec`

- Контракт `Exec`: `run(command, args, options?): Promise<{ code, stdout, stderr }>`.
- `MemoryExec`: `register(command, args | matcher, result)`, история вызовов; незарегистрированная команда — `CommandNotFoundError`.

### `browser`

Моки браузерных внешних API. DOM не реализуется (для него `jsdom` и `happy-dom`). Каждый мок — отдельный модуль со своим контрактом, историей вызовов (`history()` / `clearHistory()`) и установкой в `globalThis` через `install()` / `uninstall()`: методы экземпляра для единственных объектов (storage, location, history, matchMedia, navigator, clipboard), статические методы для конструкторов (`WebSocket`, `EventSource`, observers).

- `MemoryStorage` — `Storage` (`localStorage`, `sessionStorage`): `getItem`, `setItem`, `removeItem`, `clear`, `key`, `length`; событие `storage`.
- `MockLocation` и `MockHistory` — `location` и `history`: `pushState`, `replaceState`, `back`, `forward`, `go`, событие `popstate`, разбор URL.
- `MockWebSocket` — совместим с `WebSocket`; тест управляет сервером: `open()`, `receive(data)`, `serverClose(code)`, `error()` (клиентский `close()` остаётся стандартным); `sent()` — отправленные сообщения. События диспатчатся синхронно.
- `MockEventSource` — совместим с `EventSource`; `emit(type, data)`.
- `MockMatchMedia` — `matchMedia`; `setMatches(query, value)` вызывает слушателей.
- `MockIntersectionObserver`, `MockResizeObserver` — ручной запуск колбэков: `trigger(entries)`.
- `MockClipboard` — `navigator.clipboard`: `readText`, `writeText`.
- `MockNavigator` — `onLine`, `language`, `languages`, `userAgent`; события `online` и `offline`.

Не входят: `IndexedDB`, `Notification`, `canvas`.

### Тесты (TDD: тесты раньше кода)

- Для каждого мока: unit-тесты самого мока, интеграционный тест «пример сервиса + мок», проверка контракта на уровне типов.
- Проверка параллельных обращений там, где есть общее состояние.

## Критерии приёмки

- [x] `pnpm install` и `pnpm -r build` проходят без ошибок
- [x] `pnpm -r test` — все тесты проходят
- [x] `pnpm lint` и `tsc --noEmit` — без ошибок и предупреждений
- [x] Покрытие каждого пакета ≥ 90%
- [x] `MemoryFS` бросает ошибки с теми же `code`, что и `node:fs/promises`
- [x] `MemoryNet` и `MockFetch` принимаются там, где ожидается `typeof fetch`
- [x] `MemoryStorage`, `MockHistory`, `MockWebSocket`, `MockEventSource`, `MockMediaQueryList`, `MockIntersectionObserver`, `MockResizeObserver` совместимы по типам с DOM (проверка `satisfies`); `MockLocation`, `MockNavigator`, `MockClipboard` — частичные, проверяется установка в `globalThis`
- [x] `FakeClock.advance` запускает таймеры в порядке срабатывания
- [x] `SeededRandom` с одним seed даёт одинаковую последовательность
- [x] В репозитории нет `pi`, `opencode`, `package-lock.json`, `node_modules`

## Вне фундамента

`pi`, `opencode`, `webview`, `renderer/*`, `tui`, `sqlmock`.

## Открытые вопросы

Нет.
