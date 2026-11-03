import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {http, HttpResponse} from 'msw'
import {expect, waitFor, within} from 'storybook/test'
import {notedLines, type Use} from '@/lib/argMarks'
import {describeArgs, describeError, describeEvent, describeNotedBytes, findBytes, nodesOf, type NotedPreimage, type Preimage, withCallViews} from '@/lib/args'
import {blake2_256} from '@/lib/hash'
import {runtimeAt} from '@/lib/runtime'
import {ss58Encode} from '@/lib/ss58'
import {block, hashOf, PEOPLE} from '../../../mock/fixtures.js'
import {CHAIN_PROPS} from '../../../mock/fixtures/blocks.js'
import {all, expectFits} from '../../.storybook/fit'
import {shortAddr} from './AddressText'
import {ArgsTable, ArgsView} from './ArgsTable'

const meta = {title: 'Components/ArgsTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
type Context = Parameters<NonNullable<Story['play']>>[0]

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

const INFO = {display: '0x68617070796368696e61', x: '0x', bio: '0x', web: '0x', email: '0x', avatar: '0x', github: '0x', matrix: '0x', discord: '0x', telegram: '0x'}
const emptyFields = story('Identity', 'set_identity', {info: INFO}, ['happychina', 'telegram'])

const referendumSubmit = story('Referenda', 'submit', SUBMIT, ['Origins', 'BigSpender', 'Inline', 'Treasury.spend', '10,000,000', '#138,698', 'After', '8,640 blocks'])

const textHex = (text: string) => `0x${Buffer.from(text).toString('hex')}`

const hexHash = (hex: string) => blake2_256(Uint8Array.from(hex.slice(2).match(/../g) ?? [], byte => parseInt(byte, 16)))

const encodedCall = (call: unknown) => `0x${Buffer.from(runtimeAt(block(0).specVersion)!.encodeCall(call as never)).toString('hex')}`

const REMARK = {__kind: 'System', value: {__kind: 'remark', remark: '0x'}}

const BINARY_REMARK = `0x${'ab'.repeat(32)}`

const BINARY_CALL = {__kind: 'System', value: {__kind: 'remark', remark: BINARY_REMARK}}

const REMARK_HASH = blake2_256(new Uint8Array(32).fill(0xab))

const LONG_REMARK_TEXT = `${'a'.repeat(4096)} and the rest`

const callRow = (pallet: string, method: string, args: unknown, subcalls: unknown[] = []) => ({id: 'call', pallet, method, args, block: {specVersion: block(0).specVersion}, subcalls})

// a call as its row in the call tree gets it, args trimmed, JSON one click away
function inCallTree(pallet: string, method: string, args: unknown, subcalls: unknown[] = []): Story {
    const [row] = withCallViews([callRow(pallet, method, args, subcalls)])
    return {render: () => <ArgsView node={row.view} raw={row.args} chain={CHAIN_PROPS} />}
}

const openJson = ({canvas, userEvent}: Context) => userEvent.click(canvas.getByRole('tab', {name: 'JSON'}))

const openTable = ({canvas, userEvent}: Context) => userEvent.click(canvas.getByRole('tab', {name: 'Table'}))

const notePreimage = (bytes: string) => inCallTree('Preimage', 'note_preimage', {bytes})

const remark = (hex: string) => inCallTree('System', 'remark', {remark: hex})

const WASM = '0x' + Array.from({length: 31_250}, (_, i) => hashOf('wasm', i).slice(2)).join('')

const SHORT_TEXT = textHex('A short preimage')

const NINE_BYTES = `0x${'ab'.repeat(9)}`

const TEN_BYTES = `0x${'ab'.repeat(10)}`

const ONE_BYTE = '0xab'

const SHORT_CODE = `0x${'ab'.repeat(32)}`

const LONG_REMARK = `0x${'ab'.repeat(2048)}`

const REMARK_TEXT = 'A short remark'

const REMARK_LINES = 'Line one of a remark\nLine two'

const AT_LIMIT = `${'界'.repeat(1365)}a`

const bytesApi = (text: string) => [http.get('*/api/bytes', () => HttpResponse.text(text))]

const LONG_TEXT = `${'😀'.repeat(1100)} and the rest\nof the remark`

const LONG_MARKDOWN = `# Marketing budget\n\nThis referendum allocates **2,000,000 NUMN** from the treasury to community airdrops and task rewards.`

const centerY = (el: Element) => {
    const {top, height} = el.getBoundingClientRect()
    return top + height / 2
}

const BIG_CODE = `0x${'cd'.repeat(20_000)}`

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

const LOOKUP = {...SUBMIT, proposal: {__kind: 'Lookup', hash: OLD_TEXT, len: 10}}

function notedStory(noted: NotedPreimage, shows: string[]): Story {
    const node = view('Preimage', 'unnote_preimage', {hash: OLD_TEXT})
    for (const hex of nodesOf([node], 'hex')) hex.noted = noted
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas, canvasElement}) => {
            await expect(canvas.getByText(OLD_TEXT)).toBeVisible()
            await expect(canvas.getByRole('button', {name: 'copy'})).toBeVisible()
            for (const text of shows) await expect(canvas.getAllByText(text, {exact: false})[0]).toBeVisible()
            await expect(canvasElement.querySelector('[data-slot=collapsible-trigger]')).toBeNull()
            expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
        },
    }
}

const NOTED_IN = 'noted in'

const GRANT = view('Treasury', 'spend', {amount: '10000000000000000000000000', beneficiary: BOB, validFrom: null})

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

const decisionStartedTally = eventStory(
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
        if (cell.closest('[data-slot=args-table]') !== grid.parentElement) continue
        const left = cell.getBoundingClientRect().left
        expect(lines.some(line => Math.abs(line - left) < 0.5), `${cell.textContent} starts at ${left}, off the lines ${lines.join(', ')}`).toBe(true)
    }
}

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

export const AccountsByIdentity = withIdentities([PEOPLE[0], PEOPLE[8], PEOPLE[2]], ['Polaris Guild', 'payouts', shortAddr(ss58Encode(PEOPLE[2].id, CHAIN_PROPS.ss58))])

export const BaseFeeElasticity = story('BaseFee', 'set_elasticity', {elasticity: 125000}, ['12.5'])

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
    ['Balances.transfer_keep_alive']
)

export const BatchListedBelow = story('Utility', 'batch_all', {calls: [{__kind: 'Balances', value: {__kind: 'transfer_keep_alive', dest: ID(ALICE), value: '1'}}]}, ['1 call', 'listed below'], true)

// the batch's own JSON holds the call it wraps, so that copy is summarized too
export const BatchedNotePreimage: Story = {
    ...inCallTree('Utility', 'batch_all', {calls: [{__kind: 'Preimage', value: {__kind: 'note_preimage', bytes: SHORT_TEXT}}]}, [{}]),
    play: async context => {
        await openJson(context)
        await expect(context.canvasElement.textContent).toContain('(16 bytes)')
        await expect(context.canvasElement.textContent).not.toContain(SHORT_TEXT)
        await openTable(context)
    },
}

// a block number field that counts blocks reads as a span, the one that names a block links to it
export const BlockSpanAndHeight: Story = {
    render: () => (
        <div className="space-y-3">
            <ArgsTable node={view('Scheduler', 'schedule_after', {after: 100, maybePeriodic: null, priority: 63, call: REMARK})} chain={CHAIN_PROPS} />
            <ArgsTable node={view('Scheduler', 'schedule', {when: 100, maybePeriodic: null, priority: 63, call: REMARK})} chain={CHAIN_PROPS} />
        </div>
    ),
    play: async ({canvasElement}) => {
        const [span, height] = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=args-table]')].filter(table => !table.parentElement!.closest('[data-slot=args-table]')).map(table => within(table))
        await expect(span.getByText('100 blocks')).toBeVisible()
        expect(span.queryByRole('link', {name: '#100'})).toBeNull()
        await expect(height.getByRole('link', {name: '#100'})).toHaveAttribute('href', '/block/100')
        expect(height.queryByText('100 blocks')).toBeNull()
        expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
    },
}

export const BountyIndex = story('Bounties', 'approve_bounty', {bountyId: 3}, ['#3'])

export const BountyTitled = titled(
    view('Bounties', 'approve_bounty', {bountyId: 3}),
    node => (nodesOf([node], 'bounty')[0].title = 'Audit of the PoScan verifier'),
    ['#3', 'Audit of the PoScan verifier']
)

// a noted runtime upgrade stays out of what the page sends, and its code can still be downloaded
export const CallViewsLeaveNotedCodeOut: Story = {
    ...story('System', 'set_code', {code: BIG_CODE}, ['(20,000 bytes)']),
    play: async () => {
        const noted = encodedCall({__kind: 'System', value: {__kind: 'set_code', code: BIG_CODE}})
        const sent = JSON.stringify(withCallViews([callRow('Preimage', 'note_preimage', {bytes: noted})]))
        await expect(sent).not.toContain('cd'.repeat(100))
        await expect(sent).toContain('"method":"set_code"')
        await expect(sent).toContain('(20,000 bytes)')
        const codeHash = blake2_256(new Uint8Array(20_000).fill(0xcd))
        await expect(sent).toContain(`/api/bytes?call=call&hash=${codeHash}`)
        await expect(findBytes({bytes: noted}, codeHash, block(0).specVersion)).toBe(BIG_CODE)
    },
}

// what a page hands to the browser holds previews and links, however long the remark
export const CallViewsLeaveRemarksOut: Story = {
    ...story('System', 'remark', {remark: BINARY_REMARK}, ['(32 bytes)']),
    play: async () => {
        const remark = (hex: string) => ({__kind: 'System', value: {__kind: 'remark', remark: hex}})
        const sent = JSON.stringify(
            withCallViews([
                callRow('System', 'remark', {remark: BINARY_REMARK}),
                callRow('System', 'remark', {remark: textHex(LONG_REMARK_TEXT)}),
                callRow('Utility', 'batch', {calls: [remark(BINARY_REMARK), remark(textHex(LONG_REMARK_TEXT))]}, [{}]),
            ])
        )
        await expect(sent).not.toContain(BINARY_REMARK)
        await expect(sent).not.toContain(textHex(LONG_REMARK_TEXT))
        await expect(sent).not.toContain('and the rest')
        await expect(sent).toContain('/api/bytes?call=call&hash=')
    },
}

export const DecisionStartedTally = decisionStartedTally

// a track id reads by the name the runtime gives it
export const DelegateTrack = story('ConvictionVoting', 'delegate', {class: 30, to: ID(ALICE), conviction: {__kind: 'Locked1x'}, balance: '1000000000000000000'}, ['Small Spender', 'Locked1x'])

export const DelegatedEventTrack = eventStory('ConvictionVoting', 'Delegated', [ALICE, BOB, 30], ['Small Spender'])

export const EmptySequence = story('Identity', 'set_subs', {subs: []}, ['subs', '—'])

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

export const ExtrinsicError: Story = (() => {
    const node = describeError({value: {error: '0x0a000000', index: 21}, __kind: 'Module'}, block(0).specVersion)!
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => expect(canvas.getByText('Referenda.NoDeposit')).toBeVisible(),
    }
})()

// a module error reads by the pallet and the error it names
export const ExtrinsicFailedModuleError = eventStory(
    'System',
    'ExtrinsicFailed',
    {dispatchInfo: {class: {__kind: 'Normal'}, weight: {refTime: '1178652000', proofSize: '219984'}, paysFee: {__kind: 'Yes'}}, dispatchError: {value: {error: '0x01000000', index: 20}, __kind: 'Module'}},
    ['Module', 'ConvictionVoting.NotVoter']
)

// a nested or inline call's bytes are found by their hash wherever they sit in the args
export const FindsBytesInArgs: Story = {
    ...story('System', 'remark', {remark: BINARY_REMARK}, ['(32 bytes)']),
    play: async () => {
        const spec = block(0).specVersion
        const inline = encodedCall(BINARY_CALL)
        await expect(findBytes([{args: {remark: BINARY_REMARK}}], REMARK_HASH, spec)).toBe(BINARY_REMARK)
        await expect(findBytes({proposal: {__kind: 'Inline', value: inline}}, REMARK_HASH, spec)).toBe(BINARY_REMARK)
        await expect(findBytes({remark: '0xabcd'}, REMARK_HASH, spec)).toBeUndefined()
    },
}

export const HashOfProposalOpened = marked(
    'Referenda',
    'submit',
    LOOKUP,
    {kind: 'proposal', referendum: 3, title: 'Fund the DEX', calls: [{address: [], pallet: 'Treasury', method: 'spend', args: {}, view: GRANT}]},
    ['proposal of', 'Treasury.spend', '10,000,000'],
    true
)

export const HashOfText = marked('Referenda', 'submit', LOOKUP, TEXT, ['text of', 'Creation of the first DEX liquidity pool'])

export const HashOfTextOpened = marked('Referenda', 'submit', LOOKUP, TEXT, ['This proposal creates the first DEX liquidity pool for NUMN.'], true)

export const Heartbeat = story(
    'ImOnline',
    'heartbeat',
    {
        heartbeat: {blockNumber: 239068, sessionIndex: 3984, validatorsLen: 4, authorityIndex: 1},
        signature: '0xd2fedbc80800ecbde0890c1edb8c3bb33ef68d74a736e071bceb813c335fd86414983ed8b444ece915697864d8a5772b7ddb7883181f3ba4018292ea2db8e085',
    },
    ['#239,068', '3,984', 'validatorsLen']
)

export const IdentityWithEmptyFields: Story = {
    ...emptyFields,
    play: all(emptyFields.play!, ({canvas}) => expect(canvas.getAllByText('—')).toHaveLength(Object.values(INFO).filter(v => v === '0x').length)),
}

export const Judgement = story(
    'Identity',
    'provide_judgement',
    {target: ID(BOB), identity: '0x9b6631f9a572f30c3b92ce65103a20f066b5fa7fe38b8c0addce4b874f695710', regIndex: 0, judgement: {__kind: 'Reasonable'}},
    ['Reasonable', '0x9b6631f9a572f30c3b92ce65103a20f066b5fa7fe38b8c0addce4b874f695710']
)

// bytes that aren't text show their ends and size in the table and the JSON
export const LongRemark: Story = {
    ...remark(LONG_REMARK),
    play: async context => {
        const {canvas, canvasElement} = context
        await expect(canvas.getByText(`${LONG_REMARK.slice(0, 10)}…${LONG_REMARK.slice(-8)} (2,048 bytes)`)).toBeVisible()
        await expect(canvas.getByText(hexHash(LONG_REMARK))).toBeVisible()
        await expect(within(canvasElement.querySelector<HTMLElement>('[data-slot=args-table]')!).getByRole('button', {name: 'copy'})).toBeVisible()
        await expect(canvas.getByRole('link', {name: 'download'}).getAttribute('href')).toMatch(new RegExp(`^/api/bytes\\?call=.+&hash=${hexHash(LONG_REMARK)}$`))
        await expect(canvasElement.textContent).not.toContain(LONG_REMARK)
        await openJson(context)
        await expect(canvasElement.textContent).toContain('(2,048 bytes)')
        await expect(canvasElement.textContent).not.toContain(LONG_REMARK)
        await openTable(context)
    },
}

// a column narrower than the args, the way a phone or a deep call leaves it
export const Narrow: Story = {
    ...referendumSubmit,
    render: () => (
        <div className="max-w-72">
            <ArgsTable node={view('Referenda', 'submit', SUBMIT)} chain={CHAIN_PROPS} />
        </div>
    ),
}

// a table nested in a row takes its columns from the outer one, so the variant
// cell of one row and the keys of the table in another line up
export const NestedKeysAligned: Story = {
    ...decisionStartedTally,
    play: async ({canvasElement}) => expectColumnsAligned(canvasElement),
}

// long keys widen the first column, the values right of it still fit their cells
export const NestedKeysAlignedLongKeys: Story = {
    ...referendumSubmit,
    play: async ({canvasElement}) => {
        expectColumnsAligned(canvasElement)
        expectFits(...canvasElement.querySelectorAll('[data-slot=args-table]'))
    },
}

export const NestedRemarkBinary = story('Scheduler', 'schedule_after', {after: 100, maybePeriodic: null, priority: 63, call: BINARY_CALL}, ['0xabababab…abababab (32 bytes)'])

export const NeverNoted = notedStory({lines: [], content: null}, [])

// under ten bytes there is nothing worth eliding, the size still shows
export const NotePreimageNineBytes: Story = {
    ...notePreimage(NINE_BYTES),
    play: async context => {
        await expect(context.canvas.getByText(`${NINE_BYTES} (9 bytes)`)).toBeVisible()
        await openJson(context)
        await expect(context.canvasElement.textContent).toContain(`${NINE_BYTES} (9 bytes)`)
        await openTable(context)
    },
}

export const NotePreimageOneByte: Story = {
    ...notePreimage(ONE_BYTE),
    play: async ({canvas}) => expect(canvas.getByText(`${ONE_BYTE} (1 byte)`)).toBeVisible(),
}

export const NotePreimageTenBytes: Story = {
    ...notePreimage(TEN_BYTES),
    play: async ({canvas}) => expect(canvas.getByText(`${TEN_BYTES.slice(0, 10)}…${TEN_BYTES.slice(-8)} (10 bytes)`)).toBeVisible(),
}

// a text preimage reads as text, its JSON still shows only the ends and size
export const NotePreimageText: Story = {
    ...notePreimage(SHORT_TEXT),
    play: async context => {
        const {canvas, canvasElement} = context
        await expect(canvas.getByText('A short preimage')).toBeVisible()
        await expect(canvas.getByText(hexHash(SHORT_TEXT))).toBeVisible()
        await expect(canvas.getByRole('link', {name: 'download'})).toBeVisible()
        await openJson(context)
        await expect(canvasElement.textContent).toContain('(16 bytes)')
        await expect(canvasElement.textContent).not.toContain(SHORT_TEXT)
        await openTable(context)
    },
}

// a hash names what its note held, one line per referendum with the note it used
export const NotedText = notedStory(
    {
        lines: [
            {referendum: {kind: 'text', index: 1, title: 'First'}, extrinsic: '0000000100-abcde-000001'},
            {referendum: {kind: 'text', index: 4, title: 'Second'}, extrinsic: '0000000200-abcde-000002'},
        ],
        content: describeNotedBytes({id: 'call', bytes: PROPOSAL_TEXT, specVersion: block(0).specVersion}),
    },
    ['text of', '100-1', '200-2', NOTED_IN, 'Creation of the first DEX liquidity pool', 'UTF-8']
)

export const NotedWithoutReferendum = notedStory({lines: [{extrinsic: '0000000100-abcde-000001'}], content: describeNotedBytes({id: 'call', bytes: '0x00ff10', specVersion: block(0).specVersion})}, [NOTED_IN, '100-1', '0x00ff10 (3 bytes)'])

// the chain ties no note to a referendum, each goes with the last note before it
export const PairsNotesWithReferenda: Story = {
    ...notedStory({lines: [], content: null}, []),
    play: async () => {
        const uses: Use[] = [
            {kind: 'call', index: 1, title: null, at: 380602},
            {kind: 'call', index: 2, title: null, at: 380761},
        ]
        const notes = [
            {height: 380596, extrinsic: 'a'},
            {height: 380761, extrinsic: 'b'},
            {height: 380900, extrinsic: 'c'},
        ]
        await expect(notedLines(uses, notes).map(l => [l.referendum?.index, l.extrinsic])).toEqual([
            [1, 'a'],
            [2, 'b'],
            [undefined, 'c'],
        ])
    },
}

// a noted batch keeps a line between its calls, with nothing around them
export const PreimageBatch = story(
    'Preimage',
    'note_preimage',
    {
        bytes: encodedCall({
            __kind: 'Utility',
            value: {
                __kind: 'batch_all',
                calls: [
                    {__kind: 'System', value: {__kind: 'remark', remark: textHex('first')}},
                    {__kind: 'System', value: {__kind: 'remark', remark: textHex('second')}},
                ],
            },
        }),
    },
    ['Utility.batch_all', 'System.remark', 'hash']
)

export const PreimageBinary = story('Preimage', 'note_preimage', {bytes: '0x00ff10'}, ['0x00ff10'])

// a noted call opens onto its own table
export const PreimageCall = story('Preimage', 'note_preimage', {bytes: encodedCall({__kind: 'Prime', value: {__kind: 'upgrade', code: `0x${'cd'.repeat(32)}`}})}, ['Prime.upgrade', '0xcdcdcdcd…cdcdcdcd (32 bytes)', 'hash'])

export const PreimageText = story('Preimage', 'note_preimage', {bytes: PROPOSAL_TEXT}, ['0x43726561…554d4e2e (102 bytes)', 'UTF-8', 'Creation of the first DEX liquidity pool', 'hash'])

// a runtime's code shows only its ends and size, whatever its length
export const PrimeUpgrade: Story = {
    ...inCallTree('Prime', 'upgrade', {code: SHORT_CODE}),
    play: async context => {
        const {canvas, canvasElement} = context
        await expect(canvas.getByText(`${SHORT_CODE.slice(0, 10)}…${SHORT_CODE.slice(-8)} (32 bytes)`)).toBeVisible()
        await expect(canvas.getByText(hexHash(SHORT_CODE))).toBeVisible()
        await expect(canvas.getByRole('link', {name: 'download'})).toBeVisible()
        await expect(canvasElement.textContent).not.toContain(SHORT_CODE)
        await openJson(context)
        await expect(canvasElement.textContent).toContain('(32 bytes)')
        await expect(canvasElement.textContent).not.toContain(SHORT_CODE)
        await openTable(context)
    },
}

export const ProxyDelay = story('Proxy', 'add_proxy', {delegate: ID(ALICE), proxyType: {__kind: 'Governance'}, delay: 14400}, ['14,400 blocks', 'Governance'])

export const ProxyListedBelow = story('Proxy', 'proxy', {real: ID(BOB), forceProxyType: null, call: {__kind: 'Balances', value: {__kind: 'transfer_keep_alive', dest: ID(ALICE), value: '1'}}}, ['Balances.transfer_keep_alive', 'listed below', 'forceProxyType'], true)

export const ReferendumSubmit = referendumSubmit

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

export const RegistrarByIdentity = titled(
    view('Identity', 'request_judgement', {regIndex: 0, maxFee: '1000000000000000000'}),
    node => (nodesOf([node], 'registrar')[0].account = PEOPLE[0]),
    ['#0', 'Polaris Guild']
)

export const RegistrarRetired = titled(
    view('Identity', 'request_judgement', {regIndex: 3, maxFee: '1000000000000000000'}),
    node => (nodesOf([node], 'registrar')[0].account = null),
    ['#3', 'Retired']
)

export const RegistrarUnknown = story('Identity', 'request_judgement', {regIndex: 1, maxFee: '1000000000000000000'}, ['#1'])

// exactly at the limit, counted in bytes
export const RemarkAtTextLimit: Story = {
    ...remark(textHex(AT_LIMIT)),
    play: async ({canvas}) => {
        await expect(canvas.getByText(AT_LIMIT)).toBeVisible()
        await expect(canvas.getByText('4,096 bytes · UTF-8')).toBeVisible()
    },
}

// the dialog opens on the raw text and renders it as markdown on request, its header on one line
export const RemarkLongMarkdown: Story = {
    ...remark(textHex(LONG_MARKDOWN)),
    play: async ({canvas, canvasElement, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'View'}))
        const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog')
        const panel = within(dialog)
        await waitFor(() => expect(dialog.textContent).toContain('**2,000,000 NUMN**'))
        await expect(panel.queryByRole('heading', {level: 1})).toBeNull()
        await waitFor(() => {
            const centers = [panel.getByRole('heading', {name: 'Text'}), panel.getByRole('tablist'), panel.getByRole('button', {name: 'Close'})].map(centerY)
            expect(centers[1]).toBeCloseTo(centers[0], 0)
            expect(centers[2]).toBeCloseTo(centers[0], 0)
        })
        await userEvent.click(panel.getByRole('tab', {name: 'Markdown'}))
        await waitFor(() => expect(panel.getByRole('heading', {level: 1, name: 'Marketing budget'})).toBeVisible())
        await waitFor(() => expect(dialog.textContent).not.toContain('**'))
    },
}

// past the limit it cuts on a whole character and fetches the rest when the dialog opens
export const RemarkLongText: Story = {
    ...remark(textHex(LONG_TEXT)),
    parameters: {msw: bytesApi(LONG_TEXT)},
    play: async ({canvas, canvasElement, userEvent}) => {
        await expect(canvas.getByText(/UTF-8 \(truncated\)$/)).toBeVisible()
        await expect(canvasElement.textContent).toContain(`${'😀'.repeat(1024)}…`)
        await expect(canvasElement.textContent).not.toContain('and the rest')
        await userEvent.click(canvas.getByRole('button', {name: 'View'}))
        const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog')
        await waitFor(() => expect(dialog.textContent).toContain(LONG_TEXT))
        await expect(dialog.textContent).not.toContain('(truncated)')
    },
}

export const RemarkLongTextLoadFailed: Story = {
    ...remark(textHex(LONG_TEXT)),
    parameters: {msw: [http.get('*/api/bytes', () => new HttpResponse(null, {status: 404}))]},
    play: async ({canvas, canvasElement, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'View'}))
        await waitFor(() => expect(within(canvasElement.ownerDocument.body).getByText('Could not load the full text')).toBeVisible())
    },
}

export const RemarkMultilineText: Story = {
    ...remark(textHex(REMARK_LINES)),
    play: async ({canvas}) => {
        await expect(canvas.getByText('29 bytes · UTF-8')).toBeVisible()
        await expect(canvas.getByText(hexHash(textHex(REMARK_LINES)))).toBeVisible()
    },
}

export const RemarkShortBinary: Story = {
    ...remark('0x00ff10'),
    play: async ({canvas}) => expect(canvas.getByText('0x00ff10 (3 bytes)')).toBeVisible(),
}

// text has a hash to copy and nothing to download
export const RemarkText: Story = {
    ...remark(textHex(REMARK_TEXT)),
    play: async context => {
        const {canvas, canvasElement} = context
        await expect(canvas.getByText(REMARK_TEXT)).toBeVisible()
        await expect(canvas.getByText('14 bytes · UTF-8')).toBeVisible()
        await expect(canvas.getByText(hexHash(textHex(REMARK_TEXT)))).toBeVisible()
        await expect(canvas.getByRole('button', {name: 'View'})).toBeVisible()
        await expect(canvas.queryByRole('link', {name: 'download'})).toBeNull()
        await openJson(context)
        await expect(canvasElement.textContent).toContain('(14 bytes)')
        await expect(canvasElement.textContent).not.toContain(textHex(REMARK_TEXT))
        await openTable(context)
    },
}

export const RemarkWithEventBinary = story('System', 'remark_with_event', {remark: BINARY_REMARK}, ['0xabababab…abababab (32 bytes)'])

// table and JSON show only the wasm's ends and size
export const RuntimeUpgradePreimage: Story = {
    ...notePreimage(WASM),
    play: async context => {
        const {canvas, canvasElement} = context
        const summary = `${WASM.slice(0, 10)}…${WASM.slice(-8)} (1,000,000 bytes)`
        await expect(canvas.getByText(summary)).toBeVisible()
        await expect(canvasElement.textContent).not.toContain(WASM.slice(0, 64))
        await openJson(context)
        await waitFor(() => expect(canvas.getByText(new RegExp(summary.replace(/[()]/g, '\\$&')))).toBeVisible())
        await expect(canvasElement.textContent).not.toContain(WASM.slice(0, 64))
        await openTable(context)
    },
}

export const SchedulePeriodic = story('Scheduler', 'schedule_after', {after: 100, maybePeriodic: [14400, 3], priority: 63, call: REMARK}, ['14,400 blocks', 'count'])

export const SchedulerTask = eventStory('Scheduler', 'Dispatched', {task: [16812, 0], id: null, result: {__kind: 'Ok'}}, ['#16,812', 'index'])

export const SetMetadataCleared = story('Referenda', 'set_metadata', {index: 9, maybeHash: null}, ['maybeHash', '—'])

// setting a referendum's text names its preimage the way a noted hash does
export const SetMetadataHash: Story = {
    ...story('Referenda', 'set_metadata', {index: 9, maybeHash: OLD_TEXT}, [OLD_TEXT]),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText(OLD_TEXT)).toBeVisible()
        await expect(canvas.getByRole('button', {name: 'copy'})).toBeVisible()
        await expect(canvasElement.querySelector('[data-slot=collapsible-trigger]')).toBeNull()
    },
}

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

export const SpendLocalUntitledReferendum: Story = (() => {
    const node = describeEvent({pallet: 'Treasury', method: 'Awarded', args: {proposalIndex: 2, award: '1000000000000000000', account: BOB}, specVersion: block(0).specVersion})!
    nodesOf([node], 'spend')[0].referendum = {index: 7, title: null}
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => expect(canvas.getByRole('link', {name: 'Referendum #7'})).toHaveAttribute('href', '/referendum/7'),
    }
})()

export const SpendUnknown = story('Treasury', 'payout', {index: 4}, ['#4'])

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

// a variant that carries nothing spans the cells a deeper one splits into
export const SubIdentitiesMixedDepth: Story = {
    ...mixedDepth,
    play: all(mixedDepth.play!, ({canvas}) => expect(canvas.getByText('None').closest('td')!.colSpan).toBe(2)),
}

export const TimestampSet = story('Timestamp', 'set', {now: '1789347605691'}, ['2026-09-14 01:00:05'])

export const Transfer = story('Balances', 'transfer_keep_alive', {dest: ID(ALICE), value: '17700000000000000000000'}, ['Id', '17,700'])

export const TransferToIdentity: Story = (() => {
    const node = view('Balances', 'transfer_keep_alive', {dest: ID(PEOPLE[1].id), value: '1000000000000000000'})
    nodesOf([node], 'account')[0].acc = PEOPLE[1]
    return {
        render: () => <ArgsTable node={node} chain={CHAIN_PROPS} />,
        play: async ({canvas}) => expect(canvas.getByText('Orbit Labs')).toBeVisible(),
    }
})()

export const UndecodableInlineProposal = story('Referenda', 'submit', {proposal: {value: '0xdeadbeef', __kind: 'Inline'}, proposalOrigin: {value: {__kind: 'SmallSpender'}, __kind: 'Origins'}, enactmentMoment: {value: 100, __kind: 'At'}}, ['0xdeadbeef', 'At', '#100'])

export const UnlockTrack = story('ConvictionVoting', 'unlock', {class: 32, target: ID(BOB)}, ['Big Spender'])

export const VoteAye = story('ConvictionVoting', 'vote', {vote: {vote: 129, __kind: 'Standard', balance: '2100000000000000000000000'}, pollIndex: 1}, ['Standard', 'Aye', '1x conviction', '2,100,000', '#1'])

export const VoteNayNoConviction = story('ConvictionVoting', 'vote', {vote: {vote: 0, __kind: 'Standard', balance: '5000000000000000000'}, pollIndex: 3}, ['Nay', '0x conviction', '5'])
