import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {chainInfo, HEAD, hex, numn, person} from '../../../../mock/fixtures.js'
import {batchAll, busy, failedTransfer, failedVoteRemoval, heartbeat, mined, referendumSubmission, signedCall, timestampSet, transfer} from '../../../../mock/fixtures/blocks.js'
import {cardsFit, filterOptions} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import ExtrinsicsPage from './page'

export default {title: 'Pages/Extrinsics', ...pageMeta(ExtrinsicsPage)}

type Mined = ReturnType<typeof mined>
type Row = Mined['extrinsics'][number]
type Call = Mined['calls'][number]
type Kind = [id: string, ok: number, failed: number]
type Where = {pallet_eq?: string; method_eq?: string; success_eq?: boolean; block?: {timestamp_gte?: string; timestamp_lte?: string}}

// the calls the chain has run, how often each succeeded and how often it failed
const KINDS: Kind[] = [
    ['Balances.transfer_all', 2, 0],
    ['Balances.transfer_allow_death', 14, 0],
    ['Balances.transfer_keep_alive', 565, 12],
    ['ConvictionVoting.remove_vote', 4, 1],
    ['ConvictionVoting.vote', 24, 0],
    ['Ethereum.transact', 74, 0],
    ['Identity.add_registrar', 1, 0],
    ['Identity.provide_judgement', 2, 0],
    ['Identity.request_judgement', 1, 0],
    ['Identity.set_fee', 1, 0],
    ['Identity.set_identity', 6, 0],
    ['Identity.set_subs', 1, 0],
    ['ImOnline.heartbeat', 67_210, 0],
    ['Proxy.proxy', 3, 0],
    ['Referenda.place_decision_deposit', 2, 0],
    ['Timestamp.set', HEAD, 0],
    ['Utility.batch', 1, 0],
    ['Utility.batch_all', 5_440, 0],
    ['Vesting.vest', 11, 0],
]

const callKinds = KINDS.map(([id]) => ({id, pallet: id.split('.')[0], method: id.split('.')[1]}))

const matches = (id: string, where?: Where) => (!where?.pallet_eq || id.startsWith(where.pallet_eq + '.')) && (!where?.method_eq || id.endsWith('.' + where.method_eq))
const outcome = ([, ok, failed]: Kind, where?: Where) => (where?.success_eq === undefined ? ok + failed : where.success_eq ? ok : failed)

// the page asks for its total and for one call total per pallet, each under the filters in the url
const counting =
    (kinds: Kind[]) =>
    ({where}: {where?: Where}) => ({totalCount: kinds.filter(([id]) => matches(id, where)).reduce((n, k) => n + outcome(k, where), 0)})

const take = (blocks: Mined[], keep: (x: Row) => boolean = () => true) => blocks.flatMap(b => b.extrinsics).filter(keep).slice(0, 20)

// a pallet filter lists calls, each carrying the extrinsic it belongs to
const hits = (blocks: Mined[], keep: (c: Call) => boolean) =>
    blocks
        .flatMap(b => b.calls.map((c: Call) => ({...c, extrinsic: b.extrinsics.find((x: Row) => c.id === x.id || c.id.startsWith(`${x.id}-`))})))
        .filter(keep)
        .slice(0, 20)

const list = (extrinsics: Row[], searchParams: Record<string, string> = {}, kinds = KINDS, calls: ReturnType<typeof hits> = []) =>
    pageStory({callKinds, extrinsics, calls, extrinsicsConnection: counting(kinds), callsConnection: counting(kinds)}, {searchParams})

const RECENT = [
    mined(HEAD, [timestampSet, transfer]),
    mined(HEAD - 1, [timestampSet]),
    busy(HEAD - 2),
    mined(HEAD - 3, [timestampSet, heartbeat]),
    mined(HEAD - 4, [timestampSet, batchAll]),
    mined(HEAD - 5, [timestampSet]),
    mined(HEAD - 6, [timestampSet, failedVoteRemoval]),
    mined(HEAD - 7, [timestampSet, transfer]),
]

const TRANSFERS = Array.from({length: 20}, (_, i) => mined(HEAD - i * 37, [timestampSet, (height: number) => transfer(height, {from: person(i), to: person(i + 3)})]))
const isTransfer = (c: Call) => c.pallet === 'Balances'

const FAILURES = [mined(HEAD - 900, [timestampSet, failedVoteRemoval]), ...Array.from({length: 12}, (_, i) => mined(HEAD - 4_211 * (i + 1), [timestampSet, failedTransfer]))]

const ME = person(0)
const MY_BLOCKS = [
    ...Array.from({length: 6}, (_, i) => mined(HEAD - 15 - i * 2_903, [timestampSet, (height: number) => transfer(height, {from: ME})])),
    ...[0, 1].map(i => mined(HEAD - 40_000 - i * 9_000, [timestampSet, (height: number) => batchAll(height, {from: ME})])),
    mined(HEAD - 812_003, [timestampSet, (height: number) => signedCall(height, 'Identity.set_identity', {info: {display: {__kind: 'Raw13', value: hex('Polaris Guild')}}}, {from: ME})]),
]

const SEPTEMBER = Array.from({length: 10}, (_, i) => mined(HEAD - 30_000 - i * 1_200, [timestampSet, heartbeat]))

export const Many = list(take(RECENT))

export const EmptyChain: StoryObj = {
    ...pageStory({extrinsicsConnection: {totalCount: 0}}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No extrinsics yet.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Pallet')).toEqual(['[All]'])
        expect(await filterOptions(canvasElement, 'Result')).toEqual(['[All]', 'Success', 'Failed'])
    },
}

export const FilterPallet = list([], {pallet: 'Balances'}, KINDS, hits(TRANSFERS, isTransfer))

// every filter row keeps inside its card, the method select among them
export const FilterPalletAndMethod: StoryObj = {...list([], {pallet: 'Balances', method: 'transfer_keep_alive'}, KINDS, hits(TRANSFERS, isTransfer)), play: cardsFit}

export const FilterOneMatch = list([], {pallet: 'Identity', method: 'set_fee'}, KINDS, hits([mined(HEAD - 812_003, [timestampSet, (height: number) => signedCall(height, 'Identity.set_fee', {index: 0, fee: numn(2.5)}, {from: person(1)})])], c => c.pallet === 'Identity'))

// a batch spreads over one row per matching call, each naming the root it sits in
export const FilterPalletInsideBatch: StoryObj = {
    ...list([], {pallet: 'Referenda'}, [['Referenda.set_metadata', 1, 0], ['Referenda.submit', 1, 0]], hits([mined(HEAD - 12, [timestampSet, referendumSubmission])], c => c.pallet === 'Referenda')),
    play: async ({canvas}) => {
        await expect(canvas.getByText('2 calls')).toBeInTheDocument()
        await expect(canvas.getAllByRole('link', {name: `${HEAD - 12}-1`})).toHaveLength(2)
        await expect(canvas.getByText('Referenda.submit')).toBeInTheDocument()
        await expect(canvas.getByText('Referenda.set_metadata')).toBeInTheDocument()
        await expect(canvas.getAllByText('in Utility.batch_all')).toHaveLength(2)
    },
}

export const FilterFailed = list(take(FAILURES, x => !x.success), {result: 'failed'})

// pallets that never failed list at 0, the chosen one among them
export const FilterNothingMatches: StoryObj = {
    ...list(take([]), {pallet: 'Referenda', result: 'failed'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching extrinsics.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Pallet')).toEqual(['All', 'Balances 12', 'ConvictionVoting 1', 'Ethereum 0', 'Identity 0', 'ImOnline 0', 'Proxy 0', '[Referenda 0]', 'Timestamp 0', 'Utility 0', 'Vesting 0'])
        expect(await filterOptions(canvasElement, 'Result')).toEqual(['All', 'Success', '[Failed]'])
    },
}

export const FilterSigner: StoryObj = {
    ...list(take(MY_BLOCKS, x => x.signer?.id === ME.id), {signer: ss58Encode(ME.id, chainInfo.ss58)}, [
        ['Balances.transfer_keep_alive', 6, 0],
        ['Identity.set_identity', 1, 0],
        ['Utility.batch_all', 2, 0],
    ]),
    play: cardsFit,
}

export const FilterSignerNotAnAddress = list(take(RECENT), {signer: 'nu6LoXD3Vkgm'})

export const FilterDateRange = list(take(SEPTEMBER), {after: '2026-09-01', before: '2026-09-30'}, [
    ['Balances.transfer_keep_alive', 41, 2],
    ['ImOnline.heartbeat', 17_280, 0],
    ['Timestamp.set', 259_200, 0],
    ['Utility.batch_all', 380, 0],
])

// the canned rows only answer a query without a date, so they show while the bad day stays out of it
const badDay = (after: string): StoryObj => {
    const extrinsics = take(RECENT)
    return {
        ...pageStory(
            {
                callKinds,
                extrinsics: ({where}: {where?: Where}) => (where?.block ? [] : extrinsics),
                extrinsicsConnection: ({where}: {where?: Where}) => (where?.block ? {totalCount: 0} : counting(KINDS)({where})),
                callsConnection: ({where}: {where?: Where}) => (where?.block ? {totalCount: 0} : counting(KINDS)({where})),
            },
            {searchParams: {after}}
        ),
        play: async ({canvas}) => {
            await expect(canvas.getByRole('link', {name: `${HEAD}-0`})).toBeInTheDocument()
            await expect(canvas.getByRole('button', {name: 'Any date'})).toBeInTheDocument()
            await expect(canvas.queryByRole('link', {name: 'clear'})).toBeNull()
        },
    }
}

export const FilterDateNoSuchMonth = badDay('2026-13-45')

export const FilterDateNoSuchDay = badDay('2026-02-30')

export const DatePickerOpen: StoryObj = {
    ...list(take(RECENT)),
    play: async ({canvasElement}) => {
        await userEvent.click(within(canvasElement).getByRole('button', {name: /any date/i}))
    },
}
