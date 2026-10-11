import { describe, expect, it } from 'vitest'
import { CallHistory } from './history.js'

describe('CallHistory', () => {
    it('records calls in order with sequential default timestamps', () => {
        const history = new CallHistory<[string, number]>()
        history.record(['a', 1])
        history.record(['b', 2])

        expect(history.calls()).toEqual([
            { args: ['a', 1], at: 0 },
            { args: ['b', 2], at: 1 },
        ])
    })

    it('uses the injected time source', () => {
        let time = 100
        const history = new CallHistory<[string]>(() => time)
        history.record(['x'])
        time = 250
        history.record(['y'])

        expect(history.calls().map((call) => call.at)).toEqual([100, 250])
    })

    it('returns a copy that cannot mutate the history', () => {
        const history = new CallHistory<[string]>()
        history.record(['a'])

        const copy = history.calls() as unknown[]
        copy.length = 0

        expect(history.calls()).toHaveLength(1)
    })

    it('is empty initially', () => {
        expect(new CallHistory().calls()).toEqual([])
    })

    it('reset clears records and restarts default timestamps', () => {
        const history = new CallHistory<[string]>()
        history.record(['a'])
        history.reset()
        history.record(['b'])

        expect(history.calls()).toEqual([{ args: ['b'], at: 0 }])
    })
})
