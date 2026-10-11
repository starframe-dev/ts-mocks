import { describe, expect, it } from 'vitest'
import type { Logger } from './contract.js'
import { MemoryLogger } from './memory.js'

describe('MemoryLogger', () => {
    it('satisfies the Logger contract', () => {
        const logger = new MemoryLogger() satisfies Logger
        expect(logger.entries()).toEqual([])
    })

    it('records every level with its message and fields', () => {
        const logger = new MemoryLogger()
        logger.debug('d')
        logger.info('i', { id: 1 })
        logger.warn('w')
        logger.error('e', { code: 'X' })

        expect(logger.entries()).toEqual([
            { level: 'debug', message: 'd' },
            { level: 'info', message: 'i', fields: { id: 1 } },
            { level: 'warn', message: 'w' },
            { level: 'error', message: 'e', fields: { code: 'X' } },
        ])
    })

    it('filters entries by level', () => {
        const logger = new MemoryLogger()
        logger.info('a')
        logger.error('b')
        logger.info('c')

        expect(logger.byLevel('info').map((entry) => entry.message)).toEqual(['a', 'c'])
        expect(logger.byLevel('warn')).toEqual([])
    })

    it('entries returns a copy', () => {
        const logger = new MemoryLogger()
        logger.info('a')
        const copy = logger.entries() as unknown[]
        copy.length = 0

        expect(logger.entries()).toHaveLength(1)
    })

    it('reset clears the log', () => {
        const logger = new MemoryLogger()
        logger.info('a')
        logger.reset()

        expect(logger.entries()).toEqual([])
    })
})
