import type {StoryObj} from '@storybook/nextjs-vite'
import type {ExtrinsicRow} from '@/lib/gql'
import {HEAD, person} from '../../../mock/fixtures.js'
import {busy, callId, CHAIN_PROPS, failedReferendumSubmission, mined, referendumSubmission, timestampSet, transfer} from '../../../mock/fixtures/blocks.js'
import {ExtrinsicsTable, type ExtrinsicsView} from './ExtrinsicsTable'
import {Card} from './ui/card'

const whale = (height: number) => transfer(height, {from: person(7), fee: 987_654_321_987_654_321_987_654n, tip: 1_234_567_891_234_567_891_234_567n})
export const ROWS = [...busy(HEAD - 120).extrinsics, mined(HEAD - 121, [timestampSet, whale]).extrinsics[1]] as ExtrinsicRow[]

type Mined = ReturnType<typeof mined>

// one call under the root on a row of its own, the way a pallet filter lists it
function callRow({extrinsics, calls}: Mined, index: number, address: number[]): ExtrinsicRow {
    const x = extrinsics[index] as ExtrinsicRow
    const c = calls.find((c: Mined['calls'][number]) => c.id === callId(x.block.height, index, address))!
    return {...x, pallet: c.pallet, method: c.method, success: c.success, leafCalls: null, call: {id: c.id, within: {pallet: x.pallet, method: x.method}}}
}

// a call that took effect inside a batch, and one a rolled back batch left without an outcome
export const CALL_ROWS = [callRow(mined(HEAD - 122, [timestampSet, referendumSubmission]), 1, [1]), callRow(mined(HEAD - 123, [timestampSet, failedReferendumSubmission]), 1, [0])]

export const table = (view: ExtrinsicsView, rows: ExtrinsicRow[]): StoryObj => ({
    render: () => (
        <Card size="flush">
            <ExtrinsicsTable rows={rows} chain={CHAIN_PROPS} view={view} />
        </Card>
    ),
})
