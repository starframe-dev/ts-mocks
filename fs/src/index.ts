/**
 * In-Memory Filesystem Mock
 * Provides a complete fs-like interface for testing
 */

export interface FileNode {
  type: 'file' | 'directory'
  content?: string
  children?: Map<string, FileNode>
  mode?: number
  mtime?: Date
}

export interface FSMock {
  // Core operations
  readFile(path: string): string
  writeFile(path: string, content: string): void
  appendFile(path: string, content: string): void
  readdir(path: string): string[]
  mkdir(path: string): void
  rmdir(path: string): void
  unlink(path: string): void
  rm(path: string): void

  // Path operations
  exists(path: string): boolean
  isFile(path: string): boolean
  isDirectory(path: string): boolean
  stat(path: string): { size: number; mtime: Date; isFile: boolean; isDirectory: boolean }
  lstat(path: string): { size: number; mtime: Date; isFile: boolean; isDirectory: boolean }

  // Navigation
  cd(path: string): void
  pwd(): string

  // Batch operations
  readdirSync(path: string): string[]
  readFileSync(path: string): string
  writeFileSync(path: string, content: string): void
  existsSync(path: string): boolean

  // Tree operations
  tree(path?: string): string

  // Reset
  reset(): void

  // Set initial state
  seed(files: Record<string, string>): void

  // Current state
  _root: FileNode
  _cwd: string
}

export function createFSMock(initialCwd = '/'): FSMock {
  const root: FileNode = {
    type: 'directory',
    children: new Map(),
    mtime: new Date(),
  }

  let cwd = initialCwd

  function normalizePath(path: string): string {
    if (path.startsWith('/')) return path

    // Relative path from cwd
    const parts = (cwd === '/' ? [] : cwd.split('/').filter(Boolean))
    const pathParts = path.split('/').filter(Boolean)

    for (const part of pathParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.') {
        parts.push(part)
      }
    }

    return '/' + parts.join('/')
  }

  function getNode(path: string): FileNode | null {
    const normalized = normalizePath(path)
    if (normalized === '/') return root

    const parts = normalized.split('/').filter(Boolean)
    let node: FileNode = root

    for (const part of parts) {
      if (node.type !== 'directory' || !node.children) return null
      const child = node.children.get(part)
      if (!child) return null
      node = child
    }

    return node
  }

  function getParentNode(path: string): { parent: FileNode; name: string } | null {
    const normalized = normalizePath(path)
    const parts = normalized.split('/').filter(Boolean)
    if (parts.length === 0) return null

    const name = parts.pop()!
    const parentPath = '/' + parts.join('/')
    const parent = getNode(parentPath)

    if (!parent || parent.type !== 'directory') return null
    return { parent, name }
  }

  function ensureDirectory(path: string): void {
    const normalized = normalizePath(path)
    if (normalized === '/') return

    const parts = normalized.split('/').filter(Boolean)
    let node: FileNode = root

    for (const part of parts) {
      if (node.type !== 'directory') {
        node.type = 'directory'
        node.children = new Map()
      }
      if (!node.children!.has(part)) {
        node.children!.set(part, {
          type: 'directory',
          children: new Map(),
          mtime: new Date(),
        })
      }
      node = node.children!.get(part)!
    }
  }

  const mock: FSMock = {
    _root: root,
    _cwd: cwd,

    // Async-like but sync for simplicity
    readFile(path) {
      const node = getNode(path)
      if (!node) throw new Error(`ENOENT: ${path}`)
      if (node.type !== 'file') throw new Error(`EISDIR: ${path}`)
      return node.content ?? ''
    },

    writeFile(path, content) {
      const parentInfo = getParentNode(path)
      if (parentInfo) {
        parentInfo.parent.children!.set(parentInfo.name, {
          type: 'file',
          content,
          mtime: new Date(),
        })
      } else {
        // Root file or path needs creation
        ensureDirectory(path.substring(0, path.lastIndexOf('/') || 1))
        const name = path.split('/').filter(Boolean).pop()!
        const parentPath = '/' + path.split('/').filter(Boolean).slice(0, -1).join('/')
        const parent = getNode(parentPath)
        if (parent && parent.type === 'directory') {
          parent.children!.set(name, {
            type: 'file',
            content,
            mtime: new Date(),
          })
        }
      }
    },

    appendFile(path, content) {
      try {
        const existing = mock.readFile(path)
        mock.writeFile(path, existing + content)
      } catch {
        mock.writeFile(path, content)
      }
    },

    readdir(path) {
      const node = getNode(path)
      if (!node) throw new Error(`ENOENT: ${path}`)
      if (node.type !== 'directory') throw new Error(`ENOTDIR: ${path}`)
      return Array.from(node.children!.keys())
    },

    mkdir(path) {
      const normalized = normalizePath(path)
      const parts = normalized.split('/').filter(Boolean)
      let node: FileNode = root

      for (const part of parts) {
        if (node.type !== 'directory') {
          node.type = 'directory'
          node.children = new Map()
        }
        if (!node.children!.has(part)) {
          node.children!.set(part, {
            type: 'directory',
            children: new Map(),
            mtime: new Date(),
          })
        }
        node = node.children!.get(part)!
      }
    },

    rmdir(path) {
      const parentInfo = getParentNode(path)
      if (!parentInfo) throw new Error(`ENOENT: ${path}`)
      const node = parentInfo.parent.children!.get(parentInfo.name)
      if (!node) throw new Error(`ENOENT: ${path}`)
      if (node.type !== 'directory') {
        throw new Error(`ENOTDIR: ${path}`)
      }
      if (node.children && node.children.size > 0) {
        throw new Error(`ENOTEMPTY: ${path}`)
      }
      parentInfo.parent.children!.delete(parentInfo.name)
    },

    unlink(path) {
      const parentInfo = getParentNode(path)
      if (!parentInfo) throw new Error(`ENOENT: ${path}`)
      const node = parentInfo.parent.children!.get(parentInfo.name)
      if (!node) throw new Error(`ENOENT: ${path}`)
      if (node.type === 'directory') {
        throw new Error(`EISDIR: ${path}`)
      }
      parentInfo.parent.children!.delete(parentInfo.name)
    },

    rm(path) {
      try {
        mock.unlink(path)
      } catch {
        mock.rmdir(path)
      }
    },

    exists(path) {
      return getNode(path) !== null
    },

    isFile(path) {
      return getNode(path)?.type === 'file'
    },

    isDirectory(path) {
      return getNode(path)?.type === 'directory'
    },

    stat(path) {
      const node = getNode(path)
      if (!node) throw new Error(`ENOENT: ${path}`)
      return {
        size: node.content?.length ?? 0,
        mtime: node.mtime ?? new Date(),
        isFile: node.type === 'file',
        isDirectory: node.type === 'directory',
      }
    },

    lstat(path) {
      return mock.stat(path) // Same for in-memory
    },

    cd(path) {
      const normalized = normalizePath(path)
      const node = getNode(normalized)
      if (!node) throw new Error(`ENOENT: ${path}`)
      if (node.type !== 'directory') throw new Error(`ENOTDIR: ${path}`)
      cwd = normalized
      mock._cwd = cwd
    },

    pwd() {
      return cwd
    },

    // Sync aliases
    readdirSync(path) {
      return mock.readdir(path)
    },

    readFileSync(path) {
      return mock.readFile(path)
    },

    writeFileSync(path, content) {
      mock.writeFile(path, content)
    },

    existsSync(path) {
      return mock.exists(path)
    },

    tree(path = '/') {
      const node = getNode(path)
      if (!node) return ''

      function print(node: FileNode, prefix = '', isLast = true): string {
        const lines: string[] = []
        const connector = isLast ? '└── ' : '├── '

        if (node.type === 'file') {
          lines.push(prefix + connector + '(file)')
        } else {
          lines.push(prefix + connector + '/')
          const children = Array.from(node.children?.entries() || [])
          children.forEach(([name, child], index) => {
            const isLastChild = index === children.length - 1
            const newPrefix = prefix + (isLast ? '    ' : '│   ')
            lines.push(...print(child, newPrefix, isLastChild).split('\n').filter(Boolean).map(l => prefix + connector + name + '/' + l.split('/').slice(1).join('/')))
            if (child.type === 'directory') {
              lines.push(...print(child, prefix + (isLast ? '    ' : '│   '), isLastChild).split('\n'))
            }
          })
        }
        return lines.join('\n')
      }

      if (node.type === 'file') {
        return path
      }

      const lines: string[] = [path]
      const children = Array.from(node.children?.entries() || [])
      children.forEach(([name, child], index) => {
        const isLast = index === children.length - 1
        lines.push(...print(child, '', isLast).split('\n').map(l => '  ' + name + '/' + l.split('/').slice(1).join('/')))
      })

      return lines.join('\n')
    },

    reset() {
      root.type = 'directory'
      root.children = new Map()
      root.content = undefined
      cwd = initialCwd
      mock._cwd = cwd
    },

    seed(files) {
      mock.reset()
      for (const [path, content] of Object.entries(files)) {
        mock.writeFile(path, content)
      }
    },
  }

  return mock
}

// Factory
export function mockFS(initialCwd?: string): FSMock {
  return createFSMock(initialCwd)
}

export default createFSMock
