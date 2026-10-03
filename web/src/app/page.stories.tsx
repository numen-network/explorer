import type {StoryObj} from '@storybook/nextjs-vite'
import {referenda} from '../../../mock/data.js'
import {DAILY, chainDays} from '../../../mock/fixtures/home.js'
import {HEAD, HEAD_TIME, PEOPLE, block, chainInfo, numn, transfer} from '../../../mock/fixtures.js'
import {expectFits, PHONE} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'

export default {title: 'Pages/Home', ...pageMeta(Home)}

type Day = (typeof DAILY)[number]
type Window = [total: number, day: number, month: number]
type Windows = Record<'accounts' | 'miners' | 'extrinsics' | 'transfers' | 'evm', Window>

interface Where {
    height_eq?: number
    timestamp_gt?: string
    timestamp_lte?: string
    firstSeenTimestamp_gt?: string
    lastMinedTimestamp_gt?: string
    lastMinedTimestamp_isNull?: boolean
    block?: {timestamp_gt?: string; timestamp_lte?: string}
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
}

const PROTOCOL = 'poscan-v1'
const DAY_MS = 86_400_000

// every window the page asks for is either a day or thirty days back
const isDay = (since: string) => Date.now() - Date.parse(since) < 2 * DAY_MS
const sum = (days: Day[], pick: (d: Day) => number) => days.reduce((n, d) => n + pick(d), 0)
const timeAt = (head: number, height: number) => new Date(HEAD_TIME - (head - height) * chainInfo.blockTime * 1000).toISOString()

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

function home({head, best = head, finalized = Math.max(0, best - 5), days, objects = [], transfers = [], referendums = [], validators = 4, windows = {}}: Scene) {
    const counts = {...windowsOf(days), ...windows}
    // a baseline exists once the chain is older than its window
    const baseline = (since: string) => {
        const back = isDay(since) ? 1 : 30
        return head * chainInfo.blockTime * 1000 >= back * DAY_MS ? days.at(-1 - back) : undefined
    }
    return {
        chainInfos: [{...chainInfo, head: best, finalizedHead: finalized}],
        blocks: ({where = {}}: {where?: Where}) => {
            if (where.height_eq === 0) return [block(0)]
            if (where.timestamp_lte) {
                const day = baseline(where.timestamp_lte)
                return day ? [close(day)] : []
            }
            return [block(head, {timestamp: new Date().toISOString(), difficulty: days.at(-1)?.difficultyClose ?? '3600000000'})]
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
        validators: validators ? [{lastActiveSession: Math.floor(best / chainInfo.sessionLength)}] : [],
        accountsConnection: (args: {where?: Where}) => windowed(args.where?.lastMinedTimestamp_gt || args.where?.lastMinedTimestamp_isNull === false ? counts.miners : counts.accounts)(args),
        extrinsicsConnection: windowed(counts.extrinsics),
        transfersConnection: windowed(counts.transfers),
        evmTransactionsConnection: windowed(counts.evm),
    }
}

// the newest count blocks under head, each carrying the object its miner scanned
const minedUpTo = (head: number, count: number, finalized = head - 5, traits: (height: number) => object = () => ({})) =>
    Array.from({length: Math.min(count, head)}, (_, i) => head - i).map(height => ({
        block: block(height, {timestamp: timeAt(head, height), finalized: height <= finalized, ...traits(height)}),
        protocol: PROTOCOL,
    }))

const TREASURY = {id: chainInfo.treasuryAccount, identityDisplay: null}

export const HomeEmpty = pageStory(home({head: 0, days: [], validators: 0}))

export const FreshChain = pageStory(home({head: 1_234, days: chainDays(1_234).slice(-1), objects: minedUpTo(1_234, 5)}))

const firstDay = chainDays(1)[0]

export const HomeOne = pageStory(
    home({
        head: 1,
        days: [{...firstDay, blocks: 2, extrinsicsSigned: 2, transfers: 1, transferVolume: numn(17), cumExtrinsicsSigned: '2', cumTransfers: '1', cumTransferVolume: numn(17), referendaTotal: 1, accountsTotal: 13}],
        objects: minedUpTo(1, 5),
        transfers: [transfer(1, 1, {amount: numn(17), timestamp: timeAt(1, 1)})],
        referendums: [{...referenda[2], id: '0', index: 0, submittedAt: 1, submittedTimestamp: timeAt(1, 1)}],
    })
)

const MANY_FINALIZED = HEAD - 2

const manyTransfers = [
    transfer(HEAD, 2),
    transfer(HEAD - 3, 1, {from: TREASURY, call: null, extrinsic: null}),
    transfer(HEAD - 9, 4, {call: {pallet: 'Balances', method: 'transfer_allow_death'}}),
    transfer(HEAD - 15, 3),
    transfer(HEAD - 22, 1),
]

const many = {head: HEAD, finalized: MANY_FINALIZED, days: DAILY, objects: minedUpTo(HEAD, 5, MANY_FINALIZED), transfers: manyTransfers, referendums: referenda.slice(4, 9)}

export const HomeMany = pageStory(home(many))

export const HomeManyOnPhone: StoryObj = {
    ...HomeMany,
    globals: PHONE,
    play: async ({canvas}) => {
        const rail = canvas.getByRole('heading', {name: 'Latest blocks'}).closest('section')!
        const headers = [...rail.querySelectorAll('a[href^="/block/"]')].map(height => height.parentElement!)
        expectFits(...headers)
    },
}

const undecoded = {...referenda[3], id: '12', index: 12, title: null, proposalPallet: null, proposalMethod: null, proposalCalls: null, proposalAmount: null, proposalBeneficiary: null}

export const HomeReferendaEnded = pageStory(home({...many, referendums: [undecoded, referenda[0], referenda[1], referenda[9], referenda[10]]}))

export const HomeIndexing = pageStory(home({...many, best: HEAD + 4_000, finalized: HEAD + 3_998}))

const FAR = 987_654_321
const HUGE = '987654321098765432109876543210'

const farDays = DAILY.slice(-31).map((d, i, all) => ({
    ...d,
    transfers: d.transfers * 10_000,
    transferVolume: String(BigInt(d.transferVolume) * 10n ** 6n),
    ...(i === all.length - 1 && {
        cumExtrinsicsSigned: '98765432109',
        cumTransfers: '12345678901',
        issuanceTotal: HUGE,
        issuanceInactive: '0',
        issuanceTransferable: '876543210987654321098765432109',
        treasuryPot: '0',
        difficultyClose: '987654321987654',
    }),
}))

export const HomeExtremes = pageStory(
    home({
        head: FAR,
        days: farDays,
        objects: minedUpTo(FAR, 5, FAR - 5, height => ({
            extrinsicCount: 1_234,
            eventCount: 98_765,
            author: height === FAR ? null : PEOPLE[(FAR - height) % 2 ? 7 : 8],
        })),
        transfers: [
            transfer(FAR, 1, {amount: '12345678123456789123456789', from: PEOPLE[7], to: PEOPLE[7], timestamp: timeAt(FAR, FAR)}),
            transfer(FAR, 2, {amount: '1', from: PEOPLE[8], to: PEOPLE[2], timestamp: timeAt(FAR, FAR)}),
            transfer(FAR - 1, 1, {amount: '549926000123456789012345678', from: TREASURY, call: {pallet: 'Balances', method: 'force_transfer'}, timestamp: timeAt(FAR, FAR - 1)}),
        ],
        referendums: [
            {...referenda[4], id: '123456', index: 123_456, proposalAmount: '199999999999999999999999'},
            {...referenda[8], id: '123455', index: 123_455},
        ],
        validators: 1_000,
        windows: {
            accounts: [1_234_567_890, 98_765_432, 987_654_321],
            miners: [2_147_483_647, 99_999, 1_000_000],
            extrinsics: [0, 9_876_543, 987_654_321],
            transfers: [0, 1_234_567, 123_456_789],
            evm: [2_147_483_647, 98_765_432, 987_654_321],
        },
    })
)
