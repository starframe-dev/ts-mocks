import { describe, it, expect, beforeEach } from 'vitest'
import { createFSMock, mockFS } from './index.js'

describe('FS Mock', () => {
  describe('createFSMock', () => {
    let fs: ReturnType<typeof createFSMock>

    beforeEach(() => {
      fs = createFSMock('/')
    })

    describe('writeFile / readFile', () => {
      it('writes and reads a file', () => {
        fs.writeFile('/test.txt', 'Hello World')
        expect(fs.readFile('/test.txt')).toBe('Hello World')
      })

      it('throws when reading non-existent file', () => {
        expect(() => fs.readFile('/non-existent.txt')).toThrow('ENOENT')
      })

      it('overwrites existing file', () => {
        fs.writeFile('/test.txt', 'Original')
        fs.writeFile('/test.txt', 'Updated')
        expect(fs.readFile('/test.txt')).toBe('Updated')
      })

      it('writes nested files', () => {
        fs.writeFile('/a/b/c/nested.txt', 'Nested content')
        expect(fs.readFile('/a/b/c/nested.txt')).toBe('Nested content')
      })
    })

    describe('appendFile', () => {
      it('appends to existing file', () => {
        fs.writeFile('/test.txt', 'Hello')
        fs.appendFile('/test.txt', ' World')
        expect(fs.readFile('/test.txt')).toBe('Hello World')
      })

      it('creates file if not exists', () => {
        fs.appendFile('/new.txt', 'New content')
        expect(fs.readFile('/new.txt')).toBe('New content')
      })
    })

    describe('exists / isFile / isDirectory', () => {
      it('returns true for existing file', () => {
        fs.writeFile('/test.txt', '')
        expect(fs.exists('/test.txt')).toBe(true)
        expect(fs.isFile('/test.txt')).toBe(true)
        expect(fs.isDirectory('/test.txt')).toBe(false)
      })

      it('returns false for non-existent path', () => {
        expect(fs.exists('/non-existent')).toBe(false)
      })

      it('returns false for existing directory', () => {
        fs.mkdir('/mydir')
        expect(fs.isFile('/mydir')).toBe(false)
        expect(fs.isDirectory('/mydir')).toBe(true)
      })
    })

    describe('mkdir', () => {
      it('creates a directory', () => {
        fs.mkdir('/mydir')
        expect(fs.isDirectory('/mydir')).toBe(true)
      })

      it('creates nested directories', () => {
        fs.mkdir('/a/b/c')
        expect(fs.isDirectory('/a')).toBe(true)
        expect(fs.isDirectory('/a/b')).toBe(true)
        expect(fs.isDirectory('/a/b/c')).toBe(true)
      })

      it('creates directories implicitly when writing nested files', () => {
        fs.writeFile('/parent/child/file.txt', 'content')
        expect(fs.isDirectory('/parent')).toBe(true)
        expect(fs.isDirectory('/parent/child')).toBe(true)
        expect(fs.isFile('/parent/child/file.txt')).toBe(true)
      })
    })

    describe('readdir', () => {
      it('lists directory contents', () => {
        fs.mkdir('/mydir')
        fs.writeFile('/mydir/file1.txt', '')
        fs.writeFile('/mydir/file2.txt', '')

        const entries = fs.readdir('/mydir')

        expect(entries).toContain('file1.txt')
        expect(entries).toContain('file2.txt')
        expect(entries).toHaveLength(2)
      })

      it('lists root directory', () => {
        fs.writeFile('/file1.txt', '')
        fs.writeFile('/file2.txt', '')

        const entries = fs.readdir('/')

        expect(entries).toContain('file1.txt')
        expect(entries).toContain('file2.txt')
      })

      it('throws for non-existent directory', () => {
        expect(() => fs.readdir('/non-existent')).toThrow('ENOENT')
      })

      it('throws when reading file as directory', () => {
        fs.writeFile('/file.txt', '')
        expect(() => fs.readdir('/file.txt')).toThrow('ENOTDIR')
      })
    })

    describe('unlink', () => {
      it('deletes a file', () => {
        fs.writeFile('/test.txt', 'content')
        fs.unlink('/test.txt')
        expect(fs.exists('/test.txt')).toBe(false)
      })

      it('throws when deleting non-existent file', () => {
        expect(() => fs.unlink('/non-existent.txt')).toThrow('ENOENT')
      })

      it('throws when trying to unlink directory', () => {
        fs.mkdir('/mydir')
        expect(() => fs.unlink('/mydir')).toThrow('EISDIR')
      })
    })

    describe('rmdir', () => {
      it('deletes empty directory', () => {
        fs.mkdir('/mydir')
        fs.rmdir('/mydir')
        expect(fs.exists('/mydir')).toBe(false)
      })

      it('throws when deleting non-empty directory', () => {
        fs.mkdir('/mydir')
        fs.writeFile('/mydir/file.txt', '')
        expect(() => fs.rmdir('/mydir')).toThrow('ENOTEMPTY')
      })
    })

    describe('rm', () => {
      it('removes file', () => {
        fs.writeFile('/test.txt', '')
        fs.rm('/test.txt')
        expect(fs.exists('/test.txt')).toBe(false)
      })

      it('removes empty directory', () => {
        fs.mkdir('/mydir')
        fs.rm('/mydir')
        expect(fs.exists('/mydir')).toBe(false)
      })
    })

    describe('stat', () => {
      it('returns file stats', () => {
        fs.writeFile('/test.txt', 'Hello World')
        const stat = fs.stat('/test.txt')

        expect(stat.isFile).toBe(true)
        expect(stat.isDirectory).toBe(false)
        expect(stat.size).toBe(11)
        expect(stat.mtime).toBeInstanceOf(Date)
      })

      it('returns directory stats', () => {
        fs.mkdir('/mydir')
        const stat = fs.stat('/mydir')

        expect(stat.isFile).toBe(false)
        expect(stat.isDirectory).toBe(true)
      })

      it('throws for non-existent path', () => {
        expect(() => fs.stat('/non-existent')).toThrow('ENOENT')
      })
    })

    describe('cd / pwd', () => {
      it('changes directory', () => {
        fs.mkdir('/mydir')
        fs.cd('/mydir')
        expect(fs.pwd()).toBe('/mydir')
      })

      it('changes to relative path', () => {
        fs.mkdir('/parent')
        fs.mkdir('/parent/child')
        fs.cd('/parent')
        fs.cd('child')
        expect(fs.pwd()).toBe('/parent/child')
      })

      it('changes to parent with ..', () => {
        fs.mkdir('/parent')
        fs.mkdir('/parent/child')
        fs.cd('/parent/child')
        fs.cd('..')
        expect(fs.pwd()).toBe('/parent')
      })

      it('throws for non-existent directory', () => {
        expect(() => fs.cd('/non-existent')).toThrow('ENOENT')
      })
    })

    describe('Sync aliases', () => {
      it('readFileSync works', () => {
        fs.writeFile('/test.txt', 'content')
        expect(fs.readFileSync('/test.txt')).toBe('content')
      })

      it('writeFileSync works', () => {
        fs.writeFileSync('/test.txt', 'content')
        expect(fs.readFile('/test.txt')).toBe('content')
      })

      it('existsSync works', () => {
        fs.writeFile('/test.txt', '')
        expect(fs.existsSync('/test.txt')).toBe(true)
        expect(fs.existsSync('/non-existent')).toBe(false)
      })

      it('readdirSync works', () => {
        fs.mkdir('/mydir')
        fs.writeFile('/mydir/file.txt', '')
        expect(fs.readdirSync('/mydir')).toContain('file.txt')
      })
    })

    describe('reset', () => {
      it('clears all files', () => {
        fs.writeFile('/file1.txt', '')
        fs.writeFile('/file2.txt', '')
        fs.mkdir('/mydir')

        fs.reset()

        expect(fs.exists('/file1.txt')).toBe(false)
        expect(fs.exists('/file2.txt')).toBe(false)
        expect(fs.exists('/mydir')).toBe(false)
      })
    })

    describe('seed', () => {
      it('seeds initial file structure', () => {
        fs.seed({
          '/package.json': '{"name":"test"}',
          '/src/index.ts': 'export default {}',
          '/README.md': '# Test',
        })

        expect(fs.readFile('/package.json')).toBe('{"name":"test"}')
        expect(fs.readFile('/src/index.ts')).toBe('export default {}')
        expect(fs.readFile('/README.md')).toBe('# Test')
      })
    })
  })

  describe('mockFS factory', () => {
    it('creates with default cwd', () => {
      const fs = mockFS()
      expect(fs.pwd()).toBe('/')
    })

    it('accepts custom initial cwd', () => {
      const fs = mockFS('/home/user')
      expect(fs.pwd()).toBe('/home/user')
    })
  })
})
