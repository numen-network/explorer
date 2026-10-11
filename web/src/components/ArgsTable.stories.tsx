import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {describeArgs, nodesOf, type Preimage} from '@/lib/args'
import {block, PEOPLE} from '../../../mock/fixtures.js'
import {CHAIN_PROPS} from '../../../mock/fixtures/blocks.js'
import {expectFits} from '../../.storybook/fit'
import {ArgsTable} from './ArgsTable'

const meta = {title: 'Components/ArgsTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

// mainnet calls, with the args exactly as the indexer stored them
const ALICE = '0x246363e2d8802ebe387d91df0c9ca0f8b88e5d7e7626e5aad3f00eec80e7ba61'
const BOB = '0x1c0d1202d6b7983fdc6efad78298eff2b22a4e31363e245f3fac257b4236d73c'
const ID = (value: string) => ({__kind: 'Id', value})
const SPEND = '0x17051f0000004a48011416954508' + BOB.slice(2) + '01ca1d0200'
const PROPOSAL_TEXT = '0x' + Buffer.from('Creation of the first DEX liquidity pool\n\nThis proposal creates the first DEX liquidity pool for NUMN.').toString('hex')

const view = (pallet: string, method: string, args: unknown, nested = false) => describeArgs({pallet, method, args, specVersion: block(0).specVersion, nested})!

const SUBMIT = {proposal: {value: SPEND, __kind: 'Inline'}, proposalOrigin: {value: {__kind: 'BigSpender'}, __kind: 'Origins'}, enactmentMoment: {value: 8640, __kind: 'After'}}

function story(pallet: string, method: string, args: unknown, shows: string[], nested = false): Story {
    const node = view(pallet, method, args, nested)
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas, canvasElement}) => {
            for (const text of shows) await expect(canvas.getAllByText(text, {exact: false})[0]).toBeVisible()
            expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
        },
    }
}

export const Transfer = story('Balances', 'transfer_keep_alive', {dest: ID(ALICE), value: '17700000000000000000000'}, ['Id', '17,700'])

export const VoteAye = story('ConvictionVoting', 'vote', {vote: {vote: 129, __kind: 'Standard', balance: '2100000000000000000000000'}, pollIndex: 1}, ['Standard', 'Aye', '1x conviction', '2,100,000', '#1'])

export const VoteNayNoConviction = story('ConvictionVoting', 'vote', {vote: {vote: 0, __kind: 'Standard', balance: '5000000000000000000'}, pollIndex: 3}, ['Nay', '0x conviction', '5'])

export const SubIdentities = story(
    'Identity',
    'set_subs',
    {
        subs: [
            ['0x0c75ace1a6f6b7857e03f08e170590ed34fbded0b415d37de2dda6c2fa2bf85d', {value: '0x56616c696461746f7231', __kind: 'Raw10'}],
            ['0x0c75ace1f15ade9f7c63fbe5cf37982d9699a2667e14c789f37b5b720cba8e10', {value: '0x56616c696461746f7232', __kind: 'Raw10'}],
        ],
    },
    ['AccountId32', 'Data', 'Validator1', 'Validator2', 'Raw10']
)

export const EmptyList = story('Identity', 'set_subs', {subs: []}, ['subs', '—'])

export const Judgement = story(
    'Identity',
    'provide_judgement',
    {target: ID(BOB), identity: '0x9b6631f9a572f30c3b92ce65103a20f066b5fa7fe38b8c0addce4b874f695710', regIndex: 0, judgement: {__kind: 'Reasonable'}},
    ['Reasonable', '0x9b6631f9a572f30c3b92ce65103a20f066b5fa7fe38b8c0addce4b874f695710']
)

export const Heartbeat = story(
    'ImOnline',
    'heartbeat',
    {
        heartbeat: {blockNumber: 239068, sessionIndex: 3984, validatorsLen: 4, authorityIndex: 1},
        signature: '0xd2fedbc80800ecbde0890c1edb8c3bb33ef68d74a736e071bceb813c335fd86414983ed8b444ece915697864d8a5772b7ddb7883181f3ba4018292ea2db8e085',
    },
    ['#239,068', '3,984', 'validatorsLen']
)

export const IdentityWithEmptyFields = story('Identity', 'set_identity', {info: {display: '0x68617070796368696e61', x: '0x', bio: '0x', web: '0x', email: '0x', avatar: '0x', github: '0x', matrix: '0x', discord: '0x', telegram: '0x'}}, ['happychina', 'telegram'])

export const ReferendumSubmit = story(
    'Referenda',
    'submit',
    SUBMIT,
    ['Origins', 'BigSpender', 'Inline', 'Treasury.spend', '10,000,000', '#138,698', 'After', '8,640 blocks']
)

export const UndecodableInlineProposal = story('Referenda', 'submit', {proposal: {value: '0xdeadbeef', __kind: 'Inline'}, proposalOrigin: {value: {__kind: 'SmallSpender'}, __kind: 'Origins'}, enactmentMoment: {value: 100, __kind: 'At'}}, ['0xdeadbeef', 'At', '#100'])

export const PreimageText = story('Preimage', 'note_preimage', {bytes: PROPOSAL_TEXT}, ['UTF-8', 'Creation of the first DEX liquidity pool'])

export const PreimageBinary = story('Preimage', 'note_preimage', {bytes: '0x00ff10'}, ['0x00ff10'])

export const BatchListedBelow = story('Utility', 'batch_all', {calls: [{__kind: 'Balances', value: {__kind: 'transfer_keep_alive', dest: ID(ALICE), value: '1'}}]}, ['1 call', 'listed below'], true)

export const BatchNotRun = story(
    'Utility',
    'batch_all',
    {
        calls: [
            {__kind: 'Balances', value: {__kind: 'transfer_keep_alive', dest: ID(ALICE), value: '1000000000000000000'}},
            {__kind: 'Balances', value: {__kind: 'transfer_keep_alive', dest: ID(BOB), value: '2000000000000000000'}},
        ],
    },
    ['RuntimeCall', 'Balances.transfer_keep_alive']
)

export const ProxyListedBelow = story('Proxy', 'proxy', {real: ID(BOB), forceProxyType: null, call: {__kind: 'Balances', value: {__kind: 'transfer_keep_alive', dest: ID(ALICE), value: '1'}}}, ['Balances.transfer_keep_alive', 'listed below', 'forceProxyType'], true)

// a column narrower than the args, the way a phone or a deep call leaves it
export const Narrow: Story = {
    ...ReferendumSubmit,
    render: () => (
        <div className="max-w-72">
            <ArgsTable node={view('Referenda', 'submit', SUBMIT)} chain={CHAIN_PROPS} />
        </div>
    ),
}

// a block number field that counts blocks reads as a span, the one that names a block links to it
export const BlockSpanAndHeight = story(
    'Scheduler',
    'schedule_after',
    {after: 100, maybePeriodic: null, priority: 63, call: {__kind: 'System', value: {__kind: 'remark', remark: '0x'}}},
    ['100 blocks', 'System.remark', 'priority']
)

export const ProxyDelay = story('Proxy', 'add_proxy', {delegate: ID(ALICE), proxyType: {__kind: 'Governance'}, delay: 14400}, ['14,400 blocks', 'Governance'])

// a hash the index knows as a preimage, marked the way the page marks it after the lookup
const OLD_TEXT = '0x4294d175c4b9317b8ac763fe35734c956e2f61e7c98a9836f34e0c3f1a46bb3f'
const TEXT: Preimage = {kind: 'text', referendum: 0, title: 'Creation of the first DEX liquidity pool', text: 'Creation of the first DEX liquidity pool\n\nThis proposal creates the first DEX liquidity pool for NUMN.'}

function marked(pallet: string, method: string, args: unknown, preimage: Preimage, shows: string[], open = false): Story {
    const node = view(pallet, method, args)
    for (const hex of nodesOf([node], 'hex')) hex.preimage = preimage
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas, canvasElement, userEvent}) => {
            await expect(canvas.getByRole('link', {name: `Referendum #${preimage.referendum}`})).toBeVisible()
            if (open) await userEvent.click(canvas.getAllByRole('button')[0])
            for (const text of shows) await expect(canvas.getAllByText(text, {exact: false})[0]).toBeVisible()
            expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
        },
    }
}

export const HashOfText = marked('Preimage', 'unnote_preimage', {hash: OLD_TEXT}, TEXT, ['text of', 'Creation of the first DEX liquidity pool'])

export const HashOfTextOpened = marked('Preimage', 'unnote_preimage', {hash: OLD_TEXT}, TEXT, ['This proposal creates the first DEX liquidity pool for NUMN.'], true)

const GRANT = view('Treasury', 'spend', {amount: '10000000000000000000000000', beneficiary: BOB, validFrom: null})

export const HashOfProposalOpened = marked(
    'Preimage',
    'unnote_preimage',
    {hash: OLD_TEXT},
    {kind: 'proposal', referendum: 3, title: 'Fund the DEX', call: {kind: 'call', name: 'Treasury.spend', args: GRANT}},
    ['proposal of', 'Treasury.spend', '10,000,000'],
    true
)

// an account the index knows reads by its identity, the way the signer does,
// a sub by its parent and its own name, and one with none by its address
function withIdentities(people: (typeof PEOPLE)[number][], shows: string[]): Story {
    const node = view('Identity', 'set_subs', {subs: people.map(p => [p.id, {__kind: 'None'}])})
    const accounts = nodesOf([node], 'account')
    accounts.forEach((a, i) => (a.acc = people[i]))
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas, canvasElement}) => {
            for (const text of shows) await expect(canvas.getAllByText(text, {exact: false})[0]).toBeVisible()
            expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
        },
    }
}

export const AccountsByIdentity = withIdentities([PEOPLE[0], PEOPLE[8], PEOPLE[2]], ['Polaris Guild', 'payouts'])

export const TransferToIdentity: Story = (() => {
    const node = view('Balances', 'transfer_keep_alive', {dest: ID(PEOPLE[1].id), value: '1000000000000000000'})
    nodesOf([node], 'account')[0].acc = PEOPLE[1]
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => expect(canvas.getByText('Orbit Labs')).toBeVisible(),
    }
})()
