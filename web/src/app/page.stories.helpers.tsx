import {within} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
import {DAILY} from '../../../mock/fixtures/home.js'
import {HEAD, HEAD_TIME, block, chainInfo, transfer} from '../../../mock/fixtures.js'
import {type Play, expectFits, expectNoHangingDots, expectOneLine, expectTimesFit} from '../../.storybook/fit'

type Day = (typeof DAILY)[number]
type Window = [total: number, day: number, month: number]
type Windows = Record<'accounts' | 'miners' | 'extrinsics' | 'transfers' | 'evm', Window>

// a window bound is null while genesis, which carries no timestamp, is the newest block
interface Where {
    height_eq?: number
    timestamp_gt?: string | null
    timestamp_lte?: string | null
    firstSeenTimestamp_gt?: string | null
    lastMinedTimestamp_gt?: string | null
    lastMinedTimestamp_isNull?: boolean
    block?: {timestamp_gt?: string | null; timestamp_lte?: string | null}
}

interface Scene {
    head: number
    best?: number
    finalized?: number
    days: Day[]
    objects?: object[]
    transfers?: object[]
    referendums?: object[]
    validators?: number
    windows?: Partial<Windows>
    sessionLength?: number
}

export const PROTOCOL = 'poscan-v1'
const DAY_MS = 86_400_000

// every window the page asks for is either a day or thirty days back
const isDay = (since: string) => Date.now() - Date.parse(since) < 2 * DAY_MS
const sum = (days: Day[], pick: (d: Day) => number) => days.reduce((n, d) => n + pick(d), 0)
export const timeAt = (head: number, height: number) => new Date(HEAD_TIME - (head - height) * chainInfo.blockTime * 1000).toISOString()

const windowed =
    ([total, day, month]: Window) =>
    ({where = {}}: {where?: Where}) => {
        const since = where.timestamp_gt ?? where.block?.timestamp_gt ?? where.firstSeenTimestamp_gt ?? where.lastMinedTimestamp_gt
        return {totalCount: since == null ? total : isDay(since) ? day : month}
    }

function windowsOf(days: Day[]): Windows {
    const last = days.slice(-30)
    const day = days.at(-2) ?? days.at(-1)
    const count = (pick: (d: Day) => number): Window => [sum(days, pick), day ? pick(day) : 0, sum(last, pick)]
    const accounts = days.at(-1)?.accountsTotal ?? 0
    const miners = Math.round(Math.max(0, ...last.map(d => d.minersActive)) * 1.6)
    return {
        accounts: [accounts, accounts - (days.at(-2)?.accountsTotal ?? 0), accounts - (days.at(-31)?.accountsTotal ?? 0)],
        miners: [days.length ? miners + 11 : 0, days.at(-1)?.minersActive ?? 0, miners],
        extrinsics: count(d => d.extrinsicsSigned),
        transfers: count(d => d.transfers),
        evm: count(d => d.evmTxs),
    }
}

const close = (d: Day) => ({difficulty: d.difficultyClose, issuanceTotal: d.issuanceTotal, issuanceInactive: d.issuanceInactive, treasuryPot: d.treasuryPot})

export function home({head, best = head, finalized = Math.max(0, best - 5), days, objects = [], transfers = [], referendums = [], validators = 4, windows = {}, sessionLength = chainInfo.sessionLength}: Scene) {
    const counts = {...windowsOf(days), ...windows}
    // a baseline exists once the chain is older than its window
    const baseline = (since: string) => {
        const back = isDay(since) ? 1 : 30
        return head * chainInfo.blockTime * 1000 >= back * DAY_MS ? days.at(-1 - back) : undefined
    }
    return {
        chainInfos: [{...chainInfo, head: best, finalizedHead: finalized, sessionLength}],
        blocks: ({where = {}}: {where?: Where}) => {
            if (where.height_eq === 0) return [block(0)]
            // a null bound matches no block
            if ('timestamp_lte' in where) {
                const day = where.timestamp_lte != null && baseline(where.timestamp_lte)
                return day ? [close(day)] : []
            }
            return [block(head, {timestamp: head > 0 ? new Date().toISOString() : null, difficulty: days.at(-1)?.difficultyClose ?? '3600000000'})]
        },
        hourlyStats: ({where = {}}: {where?: Where}) => {
            const day = where.block?.timestamp_lte ? baseline(where.block.timestamp_lte) : undefined
            return day ? [{issuanceTransferable: day.issuanceTransferable, issuanceInactive: day.issuanceInactive}] : []
        },
        dailyStats: [...days].reverse().slice(0, 90),
        minedObjects: objects,
        meshTopologies: objects.length ? [{id: PROTOCOL, faceCount: 8}] : [],
        transfers,
        referendums,
        validatorsConnection: {totalCount: validators},
        validators: validators ? [{lastActiveSession: Math.floor(head / sessionLength)}] : [],
        accountsConnection: (args: {where?: Where}) => windowed(args.where?.lastMinedTimestamp_gt || args.where?.lastMinedTimestamp_isNull === false ? counts.miners : counts.accounts)(args),
        extrinsicsConnection: windowed(counts.extrinsics),
        transfersConnection: windowed(counts.transfers),
        evmTransactionsConnection: windowed(counts.evm),
    }
}

// the newest count blocks under head, each carrying the object its miner scanned
export const minedUpTo = (head: number, count: number, finalized = head - 5, traits: (height: number) => object = () => ({})) =>
    Array.from({length: Math.min(count, head)}, (_, i) => head - i).map(height => ({
        block: block(height, {timestamp: timeAt(head, height), finalized: height <= finalized, ...traits(height)}),
        protocol: PROTOCOL,
    }))

export const TREASURY = {id: chainInfo.treasuryAccount, identityDisplay: null}

export const MANY_FINALIZED = HEAD - 2

const manyTransfers = [
    transfer(HEAD, 2),
    transfer(HEAD - 3, 1, {from: TREASURY, call: null, extrinsic: null}),
    transfer(HEAD - 9, 4, {call: {pallet: 'Balances', method: 'transfer_allow_death'}}),
    transfer(HEAD - 15, 3),
    transfer(HEAD - 22, 1),
]

// DAILY rolls with the clock, so the chip the story checks reads a fixed window
export const many = {head: HEAD, finalized: MANY_FINALIZED, days: DAILY, objects: minedUpTo(HEAD, 5, MANY_FINALIZED), transfers: manyTransfers, referendums: referenda.slice(4, 9), windows: {extrinsics: [89_181, 1_139, 33_800] satisfies Window}}

export const homeFits: Play = async ({canvasElement}) => {
    expectBlockCardsFit(canvasElement)
    expectListsFit(canvasElement)
    expectTimesFit(canvasElement)
}

// a crowded transfer row keeps its amount whole and cuts its call short, a
// crowded referendum row squeezes its title and wraps its facts, rather than overflowing
function expectListsFit(root: HTMLElement) {
    const rows = (heading: string) => [...within(root).getByRole('heading', {name: heading}).parentElement!.nextElementSibling!.children] as HTMLElement[]
    expectFits(...rows('Transfers'), ...rows('Referenda').flatMap(row => [row, ...row.querySelectorAll(':scope > * > *')]))
    expectOneLine(...rows('Transfers').map(row => within(row).getByText(/ NUMN$/)))
}

// every block card keeps its rows inside the card, its age with its status and
// its miner each on one line and each count whole, with no line ending on a
// middle dot. a miner's name truncates on its own, its link reaching past the
// row for a wider hover
function expectBlockCardsFit(root: HTMLElement) {
    const rail = within(root).getByRole('heading', {name: 'Latest blocks'}).closest('section')!
    const cards = [...rail.querySelectorAll<HTMLElement>('[data-slot=card]')]
    const miners: Element[] = cards.map(card => within(card).getByText('Miner').parentElement!)
    const ages = within(rail).getAllByText(/^\d+[smhd] ago$/).map(age => age.parentElement!)
    expectFits(...cards.flatMap(card => [...card.children]).filter(row => !miners.includes(row)))
    expectOneLine(...ages, ...miners, ...within(rail).getAllByText(/^(Extrinsics|Events) /))
    expectNoHangingDots(rail)
}
