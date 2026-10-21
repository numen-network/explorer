import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import type {AccountRef, ProposalNode, ReferendumSpendRow} from '@/lib/gql'
import {HEAD, hex, numn, PEOPLE} from '../../../mock/fixtures.js'
import {CHAIN, proposal} from '../../../mock/fixtures/governance.js'
import {RequestCard} from './RequestCard'

const meta = {title: 'Pages/Referendum/Request'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const DAY = 8640
const party = new Map<string, AccountRef>(PEOPLE.map(p => [p.id, {identityDisplay: null, ...p}]))
const id = (n: number) => ({__kind: 'Id', value: PEOPLE[n].id})

type Call = {__kind: string; value: {__kind: string; [arg: string]: unknown}}
const call = (pallet: string, method: string, args: Record<string, unknown> = {}): Call => ({__kind: pallet, value: {__kind: method, ...args}})
const batch = (...calls: Call[]) => call('Utility', 'batch_all', {calls})
const spend = (amount: number, payee: number, validFrom: number | null = null) => call('Treasury', 'spend', {assetKind: null, amount: numn(amount), beneficiary: PEOPLE[payee].id, validFrom})
const nodesOf = (root: Call) => proposal(root).proposalCalls as ProposalNode[]

interface Case {
    root?: Call
    track?: string
    spends?: Partial<ReferendumSpendRow>[]
    enacted?: boolean
    bounties?: [number, string][]
    known?: Map<string, AccountRef>
}

const card = ({root, track = 'small_spender', spends = [], enacted = false, bounties = [], known = party}: Case): Story => ({
    render: () => (
        <div className="max-w-[380px]">
            <RequestCard
                index={12}
                track={track}
                nodes={root ? nodesOf(root) : []}
                spends={spends.map((s, i) => ({id: `spend-${i}`, kind: 'spend', status: 'AssetSpendApproved', validFrom: null, expireAt: null, paidAt: null, proposalCall: null, ...s}))}
                enacted={enacted}
                chain={CHAIN}
                head={HEAD}
                party={known}
                bounties={new Map(bounties)}
            />
        </div>
    ),
})

const notes = (canvas: HTMLElement) => [...canvas.querySelectorAll('.text-dim')].map(el => el.textContent)

export const SingleSpend: Story = {
    ...card({root: spend(50_000, 1)}),
    play: async ({canvas}) => {
        await expect(canvas.getByText('Treasury spend')).toBeVisible()
        await expect(canvas.getByText('50,000 NUMN')).toBeVisible()
        await expect(canvas.getByText('Immediately')).toBeVisible()
        await expect(canvas.queryByText('Total')).toBeNull()
    },
}

export const SingleLocalSpend: Story = {
    ...card({root: call('Treasury', 'spend_local', {amount: numn(12_000.5), beneficiary: id(0)})}),
    play: async ({canvas}) => expect(canvas.getByText('Next spend period')).toBeVisible(),
}

// a payout past its block, one a block away, ones held back days and years,
// and a spend_local that waits for the next spend period
export const EveryRelease: Story = {
    ...card({
        root: batch(
            spend(200_000, 0),
            spend(150_000, 1, HEAD - 2_000),
            spend(120_000, 3, HEAD + 1),
            spend(90_000, 5, HEAD + 45 * DAY + 1_234),
            spend(80_000, 2, HEAD + 3 * 365 * DAY),
            call('Treasury', 'spend_local', {amount: numn(60_000), beneficiary: id(4)})
        ),
    }),
    play: async ({canvasElement, canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'Show all 6'}))
        await expect(notes(canvasElement).filter(t => /^(Immediately|In |Next spend period)/.test(t ?? ''))).toEqual([
            'Immediately',
            'Immediately · #998,000',
            'In 10s · #1,000,001',
            'In 1mo 15d · #1,390,034',
            'In 3y · #10,460,800',
            'Next spend period',
        ])
    },
}

// seven tranches, three of them to one payee, more than the card lists before asking
const staged = batch(
    spend(2_000_000, 0),
    spend(1_500_000, 1),
    spend(1_000_000, 2, HEAD + 30 * DAY),
    spend(1_000_000, 2, HEAD + 60 * DAY),
    spend(1_000_000, 2, HEAD + 90 * DAY),
    spend(450_000, 3),
    spend(2_500_000, 4, HEAD + 14 * DAY)
)

export const ManyPayouts: Story = {
    ...card({root: staged}),
    play: async ({canvas, userEvent}) => {
        await expect(canvas.getByText('7 payouts')).toBeVisible()
        await expect(canvas.getByText('9,450,000 NUMN')).toBeVisible()
        await expect(canvas.queryByText('2,500,000 NUMN')).toBeNull()
        await userEvent.click(canvas.getByRole('button', {name: 'Show all 7'}))
        await expect(canvas.getByText('2,500,000 NUMN')).toBeVisible()
        await expect(canvas.queryByRole('button', {name: 'Show all 7'})).toBeNull()
    },
}

// one payout per state an enacted spend can be in, the last call left none behind
const states = batch(...Array.from({length: 9}, (_, i) => spend(1_000 * (i + 1), i % 8)))
export const PayoutStates: Story = {
    ...card({
        root: states,
        enacted: true,
        spends: [
            {proposalCall: 1, validFrom: HEAD - 10, expireAt: HEAD + 20 * DAY},
            {proposalCall: 2, validFrom: HEAD + 3 * DAY, expireAt: HEAD + 33 * DAY},
            {proposalCall: 3, validFrom: HEAD - 31 * DAY, expireAt: HEAD - DAY},
            {proposalCall: 4, status: 'Paid', paidAt: HEAD - 5},
            {proposalCall: 5, status: 'SpendProcessed', paidAt: HEAD - 5},
            {proposalCall: 6, status: 'SpendProcessed'},
            {proposalCall: 7, status: 'PaymentFailed', paidAt: HEAD - 5},
            {proposalCall: 8, status: 'AssetSpendVoided'},
        ],
    }),
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'Show all 9'}))
        const badges = [...canvas.getAllByText(/^(Claimable|Pending|Expired|Paid|Failed|Voided|Not created)$/)].map(b => b.textContent)
        await expect(badges).toEqual(['Claimable', 'Pending', 'Expired', 'Paid', 'Paid', 'Expired', 'Failed', 'Voided', 'Not created'])
        await expect(canvas.getByText('Expires in 20d · #1,172,800')).toBeVisible()
        await expect(canvas.getByText('Claimable in 3d · #1,025,920')).toBeVisible()
    },
}

export const LocalPayoutStates: Story = {
    ...card({
        root: batch(call('Treasury', 'spend_local', {amount: numn(1_000), beneficiary: id(0)}), call('Treasury', 'spend_local', {amount: numn(2_000), beneficiary: id(1)})),
        enacted: true,
        spends: [
            {proposalCall: 1, kind: 'spend_local', status: 'SpendApproved'},
            {proposalCall: 2, kind: 'spend_local', status: 'Awarded'},
        ],
    }),
    play: async ({canvas}) => {
        await expect(canvas.getByText('Approved')).toBeVisible()
        await expect(canvas.getByText('Paid')).toBeVisible()
    },
}

export const PayeesWithoutIdentity = card({root: batch(spend(1_000, 0), spend(0.000001, 1)), known: new Map()})

export const ExtremeAmount = card({root: call('Treasury', 'spend', {assetKind: null, amount: '340282366920938463463374607431768211455', beneficiary: PEOPLE[7].id, validFrom: null})})

export const ApproveBounty: Story = {
    ...card({root: call('Bounties', 'approve_bounty', {bountyId: 7}), bounties: [[7, numn(25_000)]]}),
    play: async ({canvas}) => {
        await expect(canvas.getByText('Approve bounty')).toBeVisible()
        await expect(canvas.getByRole('link', {name: '#7'})).toHaveAttribute('href', '/bounty/7')
        await expect(canvas.getByText('25,000 NUMN')).toBeVisible()
    },
}

export const ApproveBountyWithCurator = card({root: call('Bounties', 'approve_bounty_with_curator', {bountyId: 9, curator: id(4), fee: numn(500)})})

export const AddRegistrar = card({root: call('Identity', 'add_registrar', {account: id(5)}), track: 'identity_admin'})

export const RemoveRegistrar = card({root: call('Identity', 'remove_registrar', {index: 2}), track: 'identity_admin'})

export const AddUsernameAuthority: Story = {
    ...card({root: call('Identity', 'add_username_authority', {authority: id(3), suffix: hex('numen'), allocation: 10_000}), track: 'identity_admin'}),
    play: async ({canvas}) => {
        await expect(canvas.getByText('numen')).toBeVisible()
        await expect(canvas.getByText('10,000')).toBeVisible()
    },
}

export const RemoveUsernameAuthority = card({root: call('Identity', 'remove_username_authority', {suffix: hex('numen'), authority: id(3)}), track: 'identity_admin'})

export const CancelReferendum: Story = {
    ...card({root: call('Referenda', 'cancel', {index: 4}), track: 'referendum_canceller'}),
    play: async ({canvas}) => expect(canvas.getByRole('link', {name: '#4'})).toHaveAttribute('href', '/referendum/4'),
}

export const KillReferendum = card({root: call('Referenda', 'kill', {index: 5}), track: 'referendum_killer'})

export const RuntimeUpgrade: Story = {
    ...card({root: call('Prime', 'upgrade', {code: hex('a runtime blob')}), track: 'runtime_upgrade'}),
    play: async ({canvas}) => {
        await expect(canvas.getByText('Upgrade runtime')).toBeVisible()
        await expect(canvas.getByText('14 bytes')).toBeVisible()
    },
}

export const RootTrack: Story = {
    ...card({root: call('System', 'set_storage', {items: []}), track: 'root'}),
    play: async ({canvas}) => expect(canvas.getByRole('link', {name: 'See call'})).toHaveAttribute('href', '/referendum/12?tab=call'),
}

// a spend on the wish track still reads as the call, the track runs anything
export const WishTrack: Story = {
    ...card({root: spend(1_000, 0), track: 'wish_for_change'}),
    play: async ({canvas}) => {
        await expect(canvas.getByRole('link', {name: 'See call'})).toBeVisible()
        await expect(canvas.queryByText('Treasury spend')).toBeNull()
    },
}

export const MixedBatch: Story = {
    ...card({
        root: batch(spend(8_000, 3, HEAD + 9 * DAY), call('Bounties', 'approve_bounty', {bountyId: 7}), call('System', 'remark_with_event', {remark: hex('grants')}), batch(call('System', 'remark', {remark: '0x'}))),
        bounties: [[7, numn(25_000)]],
    }),
    play: async ({canvas}) => {
        await expect(canvas.getByText('Treasury spend')).toBeVisible()
        await expect(canvas.getByText('Approve bounty')).toBeVisible()
        await expect(canvas.getByText('2 other calls')).toBeVisible()
    },
}

// a spender track handed a call it does not run
export const UnknownCall: Story = {
    ...card({root: call('System', 'remark', {remark: hex('hello')})}),
    play: async ({canvas}) => expect(canvas.getByRole('link', {name: 'See call'})).toBeVisible(),
}

export const NoCall = card({})
