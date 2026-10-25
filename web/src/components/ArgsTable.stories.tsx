import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {describeArgs, describeError, describeEvent, nodesOf, type Preimage} from '@/lib/args'
import {ss58Encode} from '@/lib/ss58'
import {block, PEOPLE} from '../../../mock/fixtures.js'
import {CHAIN_PROPS} from '../../../mock/fixtures/blocks.js'
import {all, expectFits} from '../../.storybook/fit'
import {shortAddr} from './AddressText'
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

function eventStory(pallet: string, method: string, args: unknown, shows: string[]): Story {
    const node = describeEvent({pallet, method, args, specVersion: block(0).specVersion})!
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

const mixedDepth = story(
    'Identity',
    'set_subs',
    {
        subs: [
            ['0x0c75ace1a6f6b7857e03f08e170590ed34fbded0b415d37de2dda6c2fa2bf85d', {value: '0x56616c696461746f7231', __kind: 'Raw10'}],
            ['0x0c75ace1f15ade9f7c63fbe5cf37982d9699a2667e14c789f37b5b720cba8e10', {__kind: 'None'}],
        ],
    },
    ['Raw10', 'Validator1', 'None']
)

// a variant that carries nothing spans the cells a deeper one splits into
export const SubIdentitiesMixedDepth: Story = {
    ...mixedDepth,
    play: all(mixedDepth.play!, ({canvas}) => expect(canvas.getByText('None').closest('td')!.colSpan).toBe(2)),
}

export const EmptySequence = story('Identity', 'set_subs', {subs: []}, ['subs', '—'])

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

const INFO = {display: '0x68617070796368696e61', x: '0x', bio: '0x', web: '0x', email: '0x', avatar: '0x', github: '0x', matrix: '0x', discord: '0x', telegram: '0x'}
const emptyFields = story('Identity', 'set_identity', {info: INFO}, ['happychina', 'telegram'])

export const IdentityWithEmptyFields: Story = {
    ...emptyFields,
    play: all(emptyFields.play!, ({canvas}) => expect(canvas.getAllByText('—')).toHaveLength(Object.values(INFO).filter(v => v === '0x').length)),
}

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

// with no calls listed under it, a batch draws them in its own args
export const BatchCallsInline = story(
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

const REMARK = {__kind: 'System', value: {__kind: 'remark', remark: '0x'}}

// a block number field that counts blocks reads as a span, the one that names a block links to it
export const BlockSpanAndHeight: Story = {
    render: () => (
        <div className="space-y-3">
            <ArgsTable node={view('Scheduler', 'schedule_after', {after: 100, maybePeriodic: null, priority: 63, call: REMARK})} chain={CHAIN_PROPS} />
            <ArgsTable node={view('Scheduler', 'schedule', {when: 100, maybePeriodic: null, priority: 63, call: REMARK})} chain={CHAIN_PROPS} />
        </div>
    ),
    play: async ({canvasElement}) => {
        const [span, height] = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=args-table]')].map(table => within(table))
        await expect(span.getByText('100 blocks')).toBeVisible()
        expect(span.queryByRole('link')).toBeNull()
        await expect(height.getByRole('link', {name: '#100'})).toHaveAttribute('href', '/block/100')
        expect(height.queryByText('100 blocks')).toBeNull()
        expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
    },
}

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

export const AccountsByIdentity = withIdentities([PEOPLE[0], PEOPLE[8], PEOPLE[2]], ['Polaris Guild', 'payouts', shortAddr(ss58Encode(PEOPLE[2].id, CHAIN_PROPS.ss58))])

export const TransferToIdentity: Story = (() => {
    const node = view('Balances', 'transfer_keep_alive', {dest: ID(PEOPLE[1].id), value: '1000000000000000000'})
    nodesOf([node], 'account')[0].acc = PEOPLE[1]
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => expect(canvas.getByText('Orbit Labs')).toBeVisible(),
    }
})()

// a track id reads by the name the runtime gives it
export const DelegateTrack = story('ConvictionVoting', 'delegate', {class: 30, to: ID(ALICE), conviction: {__kind: 'Locked1x'}, balance: '1000000000000000000'}, ['Small Spender', 'Locked1x'])

export const UnlockTrack = story('ConvictionVoting', 'unlock', {class: 32, target: ID(BOB)}, ['Big Spender'])

export const DelegatedEventTrack = eventStory('ConvictionVoting', 'Delegated', [ALICE, BOB, 30], ['Small Spender'])

export const DecisionStartedTally = eventStory(
    'Referenda',
    'DecisionStarted',
    {index: 0, tally: {ayes: '7519568000000000000000000', nays: '0', support: '3273568000000000000000000'}, track: 32, proposal: {value: SPEND, __kind: 'Inline'}},
    ['Big Spender', '7,519,568', '3,273,568']
)

// every cell starts on a column line of the outermost table, whatever the width
function expectColumnsAligned(canvasElement: HTMLElement) {
    const grid = canvasElement.querySelector<HTMLElement>('[data-slot=args-table] > .grid')!
    let at = grid.getBoundingClientRect().left
    const lines = [at, ...getComputedStyle(grid).gridTemplateColumns.split(' ').map(w => (at += parseFloat(w)))]
    for (const cell of grid.querySelectorAll<HTMLElement>('.px-3')) {
        const left = cell.getBoundingClientRect().left
        expect(lines.some(line => Math.abs(line - left) < 0.5), `${cell.textContent} starts at ${left}, off the lines ${lines.join(', ')}`).toBe(true)
    }
}

// a table nested in a row takes its columns from the outer one, so the variant
// cell of one row and the keys of the table in another line up
export const NestedKeysAligned: Story = {
    ...DecisionStartedTally,
    play: async ({canvasElement}) => expectColumnsAligned(canvasElement),
}

// long keys widen the first column, the values right of it still fit their cells
export const NestedKeysAlignedLongKeys: Story = {
    ...ReferendumSubmit,
    play: async ({canvasElement}) => {
        expectColumnsAligned(canvasElement)
        expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
    },
}

// a module error reads by the pallet and the error it names
export const ExtrinsicFailedModuleError = eventStory(
    'System',
    'ExtrinsicFailed',
    {dispatchInfo: {class: {__kind: 'Normal'}, weight: {refTime: '1178652000', proofSize: '219984'}, paysFee: {__kind: 'Yes'}}, dispatchError: {value: {error: '0x01000000', index: 20}, __kind: 'Module'}},
    ['Module', 'ConvictionVoting.NotVoter']
)

export const ExtrinsicError: Story = (() => {
    const node = describeError({value: {error: '0x0a000000', index: 21}, __kind: 'Module'}, block(0).specVersion)!
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => expect(canvas.getByText('Referenda.NoDeposit')).toBeVisible(),
    }
})()

export const TimestampSet = story('Timestamp', 'set', {now: '1789347605691'}, ['2026-09-14 01:00:05'])

export const SchedulerTask = eventStory('Scheduler', 'Dispatched', {task: [16812, 0], id: null, result: {__kind: 'Ok'}}, ['#16,812', 'index'])

export const SchedulePeriodic = story('Scheduler', 'schedule_after', {after: 100, maybePeriodic: [14400, 3], priority: 63, call: REMARK}, ['14,400 blocks', 'count'])

const evmCall = story(
    'EVM',
    'call',
    {
        source: '0x6be02d1d3665660d22ff9624b7be0551ee1ac91b',
        target: '0x0000000000000000000000000000000000000800',
        input: '0x',
        value: '2500000000000000000',
        gasLimit: '21000',
        maxFeePerGas: '1000000000000',
        maxPriorityFeePerGas: '1500000000',
        nonce: null,
        accessList: [],
        authorizationList: [],
    },
    ['21,000']
)

// a value reads in the native token and a gas price in gwei, both U256 wei on chain
export const EvmAmountAndGas: Story = {
    ...evmCall,
    play: all(evmCall.play!, async ({canvas}) => {
        await expect(canvas.getByText('2.5')).toBeVisible()
        await expect(canvas.getByText('1,000')).toBeVisible()
        await expect(canvas.getByText('1.5')).toBeVisible()
        expect(canvas.getAllByText('gwei')).toHaveLength(2)
    }),
}

export const BaseFeeElasticity = story('BaseFee', 'set_elasticity', {elasticity: 125000}, ['12.5'])

export const BountyIndex = story('Bounties', 'approve_bounty', {bountyId: 3}, ['#3'])

// a number reads with the title or account the index has for it, marked the way the page marks it after the lookup
function titled(node: ReturnType<typeof view>, mark: (node: ReturnType<typeof view>) => void, shows: string[]): Story {
    mark(node)
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas, canvasElement}) => {
            for (const text of shows) await expect(canvas.getAllByText(text, {exact: false})[0]).toBeVisible()
            expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
        },
    }
}

const DEX = 'Creation of Numen’s First DEX Liquidity Pool'

export const ReferendumTitled = titled(
    view('ConvictionVoting', 'remove_vote', {class: 32, index: 0}),
    node => (nodesOf([node], 'referendum')[0].title = DEX),
    ['#0', DEX]
)

export const ReferendumUntitled: Story = (() => {
    const node = view('ConvictionVoting', 'remove_vote', {class: 32, index: 5})
    nodesOf([node], 'referendum')[0].title = null
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => {
            await expect(canvas.getByRole('link', {name: '#5'})).toHaveAttribute('href', '/referendum/5')
            expect(canvas.queryByText('·', {exact: false})).toBeNull()
        },
    }
})()

export const BountyTitled = titled(
    view('Bounties', 'approve_bounty', {bountyId: 3}),
    node => (nodesOf([node], 'bounty')[0].title = 'Audit of the PoScan verifier'),
    ['#3', 'Audit of the PoScan verifier']
)

export const SpendFromReferendum: Story = (() => {
    const node = view('Treasury', 'payout', {index: 0})
    nodesOf([node], 'spend')[0].referendum = {index: 0, title: DEX}
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => {
            await expect(canvas.getByText('#0')).toBeVisible()
            await expect(canvas.getByRole('link', {name: DEX})).toHaveAttribute('href', '/referendum/0')
        },
    }
})()

export const SpendUnknown = story('Treasury', 'payout', {index: 4}, ['#4'])

export const SpendLocalUntitledReferendum: Story = (() => {
    const node = describeEvent({pallet: 'Treasury', method: 'Awarded', args: {proposalIndex: 2, award: '1000000000000000000', account: BOB}, specVersion: block(0).specVersion})!
    nodesOf([node], 'spend')[0].referendum = {index: 7, title: null}
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => expect(canvas.getByRole('link', {name: 'Referendum #7'})).toHaveAttribute('href', '/referendum/7'),
    }
})()

export const RegistrarByIdentity = titled(
    view('Identity', 'request_judgement', {regIndex: 0, maxFee: '1000000000000000000'}),
    node => (nodesOf([node], 'registrar')[0].account = PEOPLE[0]),
    ['#0', 'Polaris Guild']
)

export const RegistrarUnknown = story('Identity', 'request_judgement', {regIndex: 1, maxFee: '1000000000000000000'}, ['#1'])
