import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {HEAD} from '../../../../mock/fixtures.js'
import {batchAll, busy, heartbeat, mined, referendumSubmission, sessionStart, timestampSet, transfer} from '../../../../mock/fixtures/blocks.js'
import {cardsFit, filterOptions} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import EventsPage from './page'

export default {title: 'Pages/Events/List', ...pageMeta(EventsPage)}

type Mined = ReturnType<typeof mined>
type Row = Mined['events'][number]
type Kind = [id: string, phase: string, count: number]
type Where = {pallet_eq?: string; method_eq?: string; phase_eq?: string}

// the events the chain has raised, at which phase and how often
const KINDS: Kind[] = [
    ['Balances.Deposit', 'ApplyExtrinsic', 1_204],
    ['Balances.Deposit', 'Finalization', 241_115],
    ['Balances.Issued', 'Finalization', 241_115],
    ['Balances.Transfer', 'ApplyExtrinsic', 7_423],
    ['Balances.Withdraw', 'ApplyExtrinsic', 7_590],
    ['Referenda.ConfirmStarted', 'Initialization', 2],
    ['Referenda.Confirmed', 'Initialization', 2],
    ['Referenda.MetadataSet', 'ApplyExtrinsic', 5],
    ['Referenda.Submitted', 'ApplyExtrinsic', 2],
    ['Session.NewSession', 'Initialization', 4_018],
    ['System.ExtrinsicSuccess', 'ApplyExtrinsic', 264_852],
    ['Utility.BatchCompleted', 'ApplyExtrinsic', 6_832],
]

const eventKinds = [...new Set(KINDS.map(([id]) => id))].map(id => ({id, pallet: id.split('.')[0], method: id.split('.')[1]}))

const matches = ([id, phase]: Kind, where?: Where) =>
    (!where?.pallet_eq || id.startsWith(where.pallet_eq + '.')) && (!where?.method_eq || id.endsWith('.' + where.method_eq)) && (!where?.phase_eq || phase === where.phase_eq)

// the page asks for its total and for one total per pallet, each under the filters in the url
const counting =
    (kinds: Kind[]) =>
    ({where}: {where?: Where}) => ({totalCount: kinds.filter(k => matches(k, where)).reduce((n, [, , count]) => n + count, 0)})

// newest first, as the list orders them
const take = (blocks: Mined[], keep: (e: Row) => boolean = () => true) => blocks.flatMap(b => [...b.events].reverse()).filter(keep).slice(0, 20)

const list = (events: Row[], searchParams: Record<string, string> = {}, kinds = KINDS) => pageStory({eventKinds, events, eventsConnection: counting(kinds)}, {searchParams})

const RECENT = [mined(HEAD, [timestampSet, transfer]), busy(HEAD - 1), mined(HEAD - 2, [timestampSet, heartbeat], {initialization: sessionStart(HEAD - 2)})]

// a referendum submitted in a batch, then confirmed by the scheduler with no extrinsic behind it
const REFERENDUM = [
    mined(HEAD - 40, [timestampSet], {initialization: [['Referenda.Confirmed', {index: 12, tally: {ayes: '0', nays: '0', support: '0'}}]]}),
    mined(HEAD - 900, [timestampSet], {initialization: [['Referenda.ConfirmStarted', {index: 12}]]}),
    mined(HEAD - 4_000, [timestampSet, referendumSubmission]),
]
const isReferenda = (e: Row) => e.pallet === 'Referenda'

export const Many = list(take(RECENT))

export const EmptyChain: StoryObj = {
    ...pageStory({eventsConnection: {totalCount: 0}}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No events yet.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Pallet')).toEqual(['[All]'])
        expect(await filterOptions(canvasElement, 'Phase')).toEqual(['[All]', 'Initialization', 'ApplyExtrinsic', 'Finalization'])
    },
}

// runtime events list beside the ones a call raised, with no extrinsic to point at
export const FilterPallet: StoryObj = {
    ...list(take(REFERENDUM, isReferenda), {pallet: 'Referenda'}),
    play: async ({canvas}) => {
        await expect(canvas.getByText('Referenda.Confirmed')).toBeInTheDocument()
        await expect(canvas.getByText('from Referenda.submit')).toBeInTheDocument()
        await expect(canvas.getAllByText('Initialization')).toHaveLength(2)
    },
}

export const FilterPalletAndMethod: StoryObj = {
    ...list(
        take(REFERENDUM, e => e.pallet === 'Referenda' && e.method === 'Submitted'),
        {pallet: 'Referenda', method: 'Submitted'}
    ),
    play: cardsFit,
}

export const FilterOneMatch = list(take([mined(HEAD - 7, [timestampSet, batchAll])], e => e.method === 'BatchCompleted'), {pallet: 'Utility'}, [['Utility.BatchCompleted', 'ApplyExtrinsic', 1]])

export const FilterPhaseInitialization = list(take(RECENT, e => e.phase === 'Initialization'), {phase: 'Initialization'})

export const FilterPhaseApplyExtrinsic = list(take(RECENT, e => e.phase === 'ApplyExtrinsic'), {phase: 'ApplyExtrinsic'})

export const FilterPhaseFinalization = list(take(RECENT, e => e.phase === 'Finalization'), {phase: 'Finalization'})

// pallets with nothing at the chosen phase list at 0, the chosen one among them
export const FilterNothingMatches: StoryObj = {
    ...list([], {pallet: 'Referenda', phase: 'Finalization'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching events.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Pallet')).toEqual(['All', 'Balances 482,230', '[Referenda 0]', 'Session 0', 'System 0', 'Utility 0'])
    },
}

// dated inside the month whatever day the story runs, every third day back from the 28th
const inSeptember = (b: Mined, i: number) => {
    const timestamp = `2026-09-${String(28 - i * 3).padStart(2, '0')}T12:00:00.000Z`
    return {...b, events: b.events.map((e: Row) => ({...e, block: {...e.block, timestamp}}))}
}
const SEPTEMBER = Array.from({length: 4}, (_, i) => inSeptember(mined(HEAD - 30_000 - i * 1_200, [timestampSet, transfer]), i))

export const FilterDateRange = list(take(SEPTEMBER), {after: '2026-09-01', before: '2026-09-30'}, [
    ['Balances.Deposit', 'ApplyExtrinsic', 129],
    ['Balances.Deposit', 'Finalization', 259_200],
    ['Balances.Issued', 'Finalization', 259_200],
    ['Balances.Transfer', 'ApplyExtrinsic', 43],
    ['Balances.Withdraw', 'ApplyExtrinsic', 43],
    ['Session.NewSession', 'Initialization', 4_320],
    ['System.ExtrinsicSuccess', 'ApplyExtrinsic', 259_243],
])
