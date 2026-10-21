import {HEAD, hashOf, paged} from '../../../../../mock/fixtures.js'
import {evmTxHash, heartbeat, mined, pick, timestampSet, vestingPayout} from '../../../../../mock/fixtures/blocks.js'
import {expectInContentBox} from '../../../../.storybook/fit'
import {pageStory} from '../../../../.storybook/page'

type Picked = ReturnType<typeof pick>
export type Spec = Parameters<typeof mined>[1][number]

export const H = HEAD - 120

export const of = (spec: Spec) => pick(mined(H, [timestampSet, spec]), 1)

export function detail({extrinsics, calls, events}: Picked, {tab = '', page = '1', evm = false} = {}) {
    const [x] = extrinsics
    const data = {
        extrinsics,
        calls: paged(calls),
        callsConnection: {totalCount: calls.length},
        events: paged(events),
        eventsConnection: {totalCount: events.length},
        evmTransactions: evm ? [{id: evmTxHash(H)}] : [],
    }
    return pageStory(data, {params: {id: `${x.block.height}-${x.indexInBlock}`}, searchParams: {tab, page}})
}

// each call row keeps whatever its lines hold, from its name and event count
// to the events it raised, clear of its padding
export function expectCallRowsFit(root: HTMLElement) {
    for (const row of root.querySelectorAll('[data-slot=collapsible]')) expectInContentBox(row, ...row.querySelectorAll('[data-slot=collapsible-trigger] > *, [data-slot=collapsible-content] > * > *'))
}

export const payout = pick(mined(H, [timestampSet, heartbeat, vestingPayout]), 2)

export const wasm = '0x' + Array.from({length: 31_250}, (_, i) => hashOf('wasm', i).slice(2)).join('')
