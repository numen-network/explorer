import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {AccountRef, ProposalNode} from '@/lib/gql'
import {HEAD, numn, PEOPLE} from '../../../mock/fixtures.js'
import {CHAIN} from '../../../mock/fixtures/governance.js'
import {DetailCard} from './Detail'
import {ProposalTree} from './referenda'

const meta = {title: 'Components/ProposalTree'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const DAY = 8640
const party = new Map<string, AccountRef>(PEOPLE.map(p => [p.id, {identityDisplay: null, ...p}]))

const tree = (nodes: ProposalNode[], known = party): Story => ({
    render: () => (
        <DetailCard>
            <ProposalTree nodes={nodes} chain={CHAIN} best={HEAD} party={known} />
        </DetailCard>
    ),
})

const spend = (depth: number, amount: string, payee: number, validFrom: number | null = null): ProposalNode => ({pallet: 'Treasury', method: 'spend', depth, amount, beneficiary: PEOPLE[payee].id, validFrom})

export const SingleSpend = tree([spend(0, numn(50_000), 1)])

export const SingleLocalSpend = tree([{pallet: 'Treasury', method: 'spend_local', depth: 0, amount: numn(12_000.5), beneficiary: PEOPLE[0].id, validFrom: null}])

export const NonSpendCall = tree([{pallet: 'Identity', method: 'add_registrar', depth: 0}])

export const EveryRelease = tree([
    {pallet: 'Utility', method: 'batch_all', depth: 0},
    spend(1, numn(200_000), 0),
    spend(1, numn(150_000), 1, HEAD - 2_000),
    spend(1, numn(120_000), 3, HEAD + 1),
    spend(1, numn(90_000), 5, HEAD + 45 * DAY),
    spend(1, numn(80_000), 7, HEAD + 400 * DAY),
    spend(1, numn(70_000), 2, HEAD + 3 * 365 * DAY),
])

export const NestedBatches = tree([
    {pallet: 'Utility', method: 'batch_all', depth: 0},
    {pallet: 'System', method: 'remark_with_event', depth: 1},
    {pallet: 'Utility', method: 'batch', depth: 1},
    {pallet: 'Treasury', method: 'spend_local', depth: 2, amount: numn(12_000), beneficiary: PEOPLE[3].id, validFrom: null},
    {pallet: 'Utility', method: 'force_batch', depth: 2},
    spend(3, numn(8_000), 3, HEAD + 9 * DAY),
    {pallet: 'Bounties', method: 'approve_bounty', depth: 3, bounty: 7},
    {pallet: 'Utility', method: 'batch', depth: 3},
    {pallet: 'Utility', method: 'batch', depth: 4},
    {pallet: 'System', method: 'remark', depth: 5},
    {pallet: 'Scheduler', method: 'schedule_after', depth: 1},
])

export const PayeesWithoutIdentity = tree([{pallet: 'Utility', method: 'batch', depth: 0}, spend(1, numn(1_000), 0), spend(1, '1', 1)], new Map())

export const ExtremeAmount = tree([spend(0, '340282366920938463463374607431768211455', 7)])
