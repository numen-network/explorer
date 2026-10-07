import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ExtrinsicRow} from '@/lib/gql'
import {HEAD, person} from '../../../mock/fixtures.js'
import {busy, CHAIN_PROPS, mined, timestampSet, transfer} from '../../../mock/fixtures/blocks.js'
import {ExtrinsicsTable, type ExtrinsicsView} from './ExtrinsicsTable'
import {Card} from './ui/card'

const meta = {title: 'Components/ExtrinsicsTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const whale = (height: number) => transfer(height, {from: person(7), fee: 987_654_321_987_654_321_987_654n, tip: 1_234_567_891_234_567_891_234_567n})
const ROWS = [...busy(HEAD - 120).extrinsics, mined(HEAD - 121, [timestampSet, whale]).extrinsics[1]] as ExtrinsicRow[]

const table = (view: ExtrinsicsView, rows: ExtrinsicRow[], empty?: string): Story => ({
    render: () => (
        <Card size="flush">
            <ExtrinsicsTable rows={rows} chain={CHAIN_PROPS} view={view} empty={empty} />
        </Card>
    ),
})

export const ListView = table('list', ROWS)

export const BlockView = table('block', ROWS)

export const AccountView = table('account', ROWS)

export const OneRow = table('list', ROWS.slice(2, 3))

export const Empty = table('list', [])

export const EmptyWithMessage = table('list', [], 'No matching extrinsics.')

export const EmptyAccountView = table('account', [])
