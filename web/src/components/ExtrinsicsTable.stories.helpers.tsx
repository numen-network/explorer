import type {StoryObj} from '@storybook/nextjs-vite'
import type {ExtrinsicRow} from '@/lib/gql'
import {HEAD, person} from '../../../mock/fixtures.js'
import {busy, CHAIN_PROPS, mined, timestampSet, transfer} from '../../../mock/fixtures/blocks.js'
import {ExtrinsicsTable, type ExtrinsicsView} from './ExtrinsicsTable'
import {Card} from './ui/card'

const whale = (height: number) => transfer(height, {from: person(7), fee: 987_654_321_987_654_321_987_654n, tip: 1_234_567_891_234_567_891_234_567n})
export const ROWS = [...busy(HEAD - 120).extrinsics, mined(HEAD - 121, [timestampSet, whale]).extrinsics[1]] as ExtrinsicRow[]

export const table = (view: ExtrinsicsView, rows: ExtrinsicRow[], empty?: string): StoryObj => ({
    render: () => (
        <Card size="flush">
            <ExtrinsicsTable rows={rows} chain={CHAIN_PROPS} view={view} empty={empty} />
        </Card>
    ),
})
