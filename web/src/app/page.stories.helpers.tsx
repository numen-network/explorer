import {expect, within} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
import {minedObject, topology} from '../../../mock/fixtures/blocks.js'
import {EXIT, ZERO_ADDRESS, evmAddress, evmTx, exit, units} from '../../../mock/fixtures/evm.js'
import {spend} from '../../../mock/fixtures/governance.js'
import {DAILY, chainDays} from '../../../mock/fixtures/home.js'
import {HEAD, HEAD_TIME, PEOPLE, block, chainInfo, numn, squidId, transfer} from '../../../mock/fixtures.js'
import {expectFits, expectNoHangingDots, expectOneLine} from '../../.storybook/fit'
import {evmMappedAccount} from '@/lib/evm'

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
    status_eq?: string
    validFrom_gt?: number
    expireAt_gt?: number
}

interface Scene {
    head: number
    best?: number
    finalized?: number
    days: Day[]
    objects?: object[]
    transfers?: object[]
    evmTxs?: object[]
    referendums?: object[]
    spends?: object[]
    upcoming?: Upcoming
    validators?: number
    windows?: Partial<Windows>
    sessionLength?: number
}

// what the deadline strips read, the ongoing referenda and the spends and bounties already cut to the window
interface Upcoming {
    ongoing?: object[]
    spendsValid?: object[]
    spendsExpire?: object[]
    bountiesDue?: object[]
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

export function home({head, best = head, finalized = Math.max(0, best - 5), days, objects = [], transfers = [], evmTxs = [], referendums = [], spends = [], upcoming = {}, validators = 4, windows = {}, sessionLength = chainInfo.sessionLength}: Scene) {
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
        evmTransactions: evmTxs,
        referendums: ({where = {}}: {where?: Where}) => (where.status_eq === 'Ongoing' ? (upcoming.ongoing ?? []) : referendums),
        referendumsConnection: {totalCount: referendums.length},
        treasurySpends: ({where = {}}: {where?: Where}) => (where.validFrom_gt != null ? (upcoming.spendsValid ?? []) : where.expireAt_gt != null ? (upcoming.spendsExpire ?? []) : spends),
        treasurySpendsConnection: {totalCount: spends.length},
        bounties: upcoming.bountiesDue ?? [],
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
const NDEX = {id: evmAddress(1000), symbol: 'NDEX', decimals: 18}
const NDEX_LP = {id: evmAddress(1001), symbol: 'NDEX-LP', decimals: 18}
const SENDER = evmAddress(0)
const PAIR = evmAddress(30)
const coin = (token: typeof NDEX, from: string, n: number) => ({from, amount: units(n, token.decimals), token})
const native = (from: string, to: string, amount: string) => ({amount, from: {id: evmMappedAccount(from)}, to: {id: evmMappedAccount(to)}})
// the sender's token and native transfers, as the home query asks for them
const legs = (height: number, index: number, tokens: object[], natives: object[] = []) => ({tokenTransfers: tokens, extrinsic: {id: squidId(height, index + 1), transfers: natives}})

// adding liquidity, removing it, a payment, a deployment and a reverted call, newest first
const manyEvm = [
    evmTx(HEAD - 1, 0, {from: SENDER, timestamp: timeAt(HEAD, HEAD - 1), ...legs(HEAD - 1, 0, [coin(NDEX, SENDER, 29_014.66), coin(NDEX_LP, ZERO_ADDRESS, 166.66)], [native(SENDER, PAIR, numn(1))])}),
    evmTx(HEAD - 4, 0, {from: SENDER, timestamp: timeAt(HEAD, HEAD - 4), ...legs(HEAD - 4, 0, [coin(NDEX_LP, SENDER, 66.35), coin(NDEX, PAIR, 11_551.02)], [native(PAIR, SENDER, numn(0.3835))])}),
    evmTx(HEAD - 8, 0, {from: SENDER, value: numn(2_500), timestamp: timeAt(HEAD, HEAD - 8), ...legs(HEAD - 8, 0, [], [native(SENDER, evmAddress(7), numn(2_500))])}),
    evmTx(HEAD - 13, 0, {to: null, contractAddress: evmAddress(20), timestamp: timeAt(HEAD, HEAD - 13), ...legs(HEAD - 13, 0, [])}),
    evmTx(HEAD - 20, 2, {...exit(EXIT.reverted), timestamp: timeAt(HEAD, HEAD - 20), ...legs(HEAD - 20, 2, [])}),
]

export const many = {head: HEAD, finalized: MANY_FINALIZED, days: DAILY, objects: minedUpTo(HEAD, 5, MANY_FINALIZED), transfers: manyTransfers, evmTxs: manyEvm, referendums: referenda.slice(4, 9), windows: {extrinsics: [89_181, 1_139, 33_800] satisfies Window}}

// only genesis is indexed, with no timestamp and no validator row
export const genesisOnly = {head: 0, days: [], validators: 0}

// the chain one block past genesis, a single row in every list
export const firstBlock = {
    head: 1,
    days: [{...chainDays(1)[0], blocks: 2, extrinsicsSigned: 2, transfers: 1, transferVolume: numn(17), cumExtrinsicsSigned: '2', cumTransfers: '1', cumTransferVolume: numn(17), referendaTotal: 1, accountsTotal: 13}],
    objects: minedUpTo(1, 5),
    transfers: [transfer(1, 1, {amount: numn(17), timestamp: timeAt(1, 1)})],
    evmTxs: [evmTx(1, 0, {from: SENDER, value: numn(17), timestamp: timeAt(1, 1), ...legs(1, 0, [], [native(SENDER, evmAddress(7), numn(17))])})],
    referendums: [{...referenda[2], id: '0', index: 0, submittedAt: 1, submittedTimestamp: timeAt(1, 1)}],
}

// an upgrade moved mining onto poscan-v2 two blocks ago, so the rail mixes
// objects of both protocols and each draws on its own protocol's topology
export const [V1, V2] = [topology(PROTOCOL), topology('poscan-v2')]
const mixed = minedUpTo(HEAD, 5, MANY_FINALIZED).map((o, i) => ({...o, ...minedObject(o.block.height, i < 2 ? V2.id : V1.id)}))
export const mixedProtocols = {...home({...many, objects: mixed}), meshTopologies: [V1, V2]}

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

// the widest figure every part of the page can be handed
export const far = {
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
    evmTxs: [
        evmTx(FAR, 0, {from: SENDER, timestamp: timeAt(FAR, FAR), ...legs(FAR, 0, [coin({...NDEX, symbol: 'NDEX-LP-WRAPPED'}, SENDER, 987_654_321.12)], [native(SENDER, PAIR, '12345678123456789123456789')])}),
        evmTx(FAR, 1, {to: null, contractAddress: evmAddress(21), value: '1', timestamp: timeAt(FAR, FAR), ...legs(FAR, 1, [])}),
        evmTx(FAR - 1, 2, {...exit(EXIT.notSupported), value: '549926000123456789012345678', timestamp: timeAt(FAR, FAR - 1), ...legs(FAR - 1, 2, [])}),
    ],
    referendums: [
        {...referenda[4], id: '123456', index: 123_456, proposalAmount: '199999999999999999999999'},
        {...referenda[8], id: '123455', index: 123_455},
    ],
    validators: 1_000,
    sessionLength: 14_400,
    windows: {
        accounts: [1_234_567_890, 98_765_432, 987_654_321] satisfies Window,
        miners: [2_147_483_647, 99_999, 1_000_000] satisfies Window,
        extrinsics: [0, 9_876_543, 987_654_321] satisfies Window,
        transfers: [0, 1_234_567, 123_456_789] satisfies Window,
        evm: [2_147_483_647, 98_765_432, 987_654_321] satisfies Window,
    },
}

// the card holding the list under heading, and the rows in it
// a column's title row holds a heading or the tab strip standing in for one
const titleOf = (root: HTMLElement, name: string) => within(root).queryByRole('heading', {name}) ?? within(root).getByRole('navigation', {name})
export const listCard = (root: HTMLElement, name: string) => titleOf(root, name).parentElement!.nextElementSibling as HTMLElement
export const listRows = (root: HTMLElement, name: string) => [...listCard(root, name).children] as HTMLElement[]

// a crowded activity row keeps its amount whole and on one line and cuts its mark short rather than overflowing
export function expectActivityFit(root: HTMLElement) {
    const rows = listRows(root, 'Activity')
    expectFits(...rows)
    expectOneLine(...rows.map(row => row.querySelector('[data-slot=activity-amount]')!))
}

// a crowded referendum row squeezes its title and wraps its facts rather than overflowing
export const expectReferendaFit = (root: HTMLElement) => expectFits(...listRows(root, 'Governance').flatMap(row => [row, ...row.querySelectorAll(':scope > * > *')]))

export const railOf = (root: HTMLElement) => within(root).getByRole('heading', {name: 'Latest blocks'}).closest('section')!

// every block card keeps its rows inside the card, its age with its status and
// its miner each on one line and each count whole, with no line ending on a
// middle dot. a miner's name truncates on its own, its link reaching past the
// row for a wider hover
export function expectBlockCardsFit(root: HTMLElement) {
    const rail = railOf(root)
    const cards = [...rail.querySelectorAll<HTMLElement>('[data-slot=card]')]
    const miners: Element[] = cards.map(card => within(card).getByText('Miner').parentElement!)
    const ages = within(rail).getAllByText(/^\d+[smhd] ago$/).map(age => age.parentElement!)
    expectFits(...cards.flatMap(card => [...card.children]).filter(row => !miners.includes(row)))
    expectOneLine(...ages, ...miners, ...within(rail).getAllByText(/^(Extrinsics|Events) /))
    expectNoHangingDots(rail)
}

// one deadline of every kind at a block count that reads cleanly, nearest first, with HEAD at
// a million and ten-second blocks. the referendum deciding for ten more days is left out
const track = (preparePeriod: number, decisionPeriod: number, confirmPeriod: number) => ({preparePeriod, decisionPeriod, confirmPeriod})
const ongoing = (index: number, title: string | null, submittedAt: number, decidingSince: number | null = null, confirmingSince: number | null = null) => ({
    index, title, submittedAt, decidingSince, confirmingSince, track: track(1440, 241_920, 8640),
})
export const UPCOMING = {
    ongoing: [
        ongoing(11, 'Fund the block explorer for a year', HEAD - 1000),
        ongoing(7, 'Raise the validator cap', HEAD - 20_000, HEAD - 18_000, HEAD - 7488),
        ongoing(9, null, HEAD - 98_280),
        ongoing(8, 'Mining pool grant', HEAD - 200_000, HEAD - 198_360),
        ongoing(5, 'Ten days to go', HEAD - 160_000, HEAD - 155_520),
    ],
    spendsValid: [{id: 'spend-4', validFrom: HEAD + 10_800, expireAt: HEAD + 270_000, referendum: {index: 6, title: 'Wallet audit, second stage'}}],
    spendsExpire: [{id: 'spend-3', validFrom: HEAD - 100, expireAt: HEAD + 59_040, referendum: {index: 4, title: 'Wallet audit, first stage'}}],
    bountiesDue: [{index: 2, description: 'GPU miner for Apple silicon', updateDue: HEAD + 37_800}],
}
// the two spends the strips name, as the Spends tab lists them
export const UPCOMING_SPENDS = [
    spend(4, 'AssetSpendApproved', {referendum: {index: 6, title: 'Wallet audit, second stage'}}),
    spend(3, 'AssetSpendApproved', {referendum: {index: 4, title: 'Wallet audit, first stage'}}),
]
export const NEAREST = [
    'Referendum #11 will end preparing in 1h 13m',
    'Referendum #7 will end confirming in 3h 12m',
    'Treasury spend #4 will be valid in 1d 6h',
    'Referendum #9 will time out in 2d 15h',
    'Bounty #2 curator update due in 4d 9h',
    'Referendum #8 will end deciding in 5d 1h',
    'Treasury spend #3 will expire in 6d 20h',
]

export const strips = (root: HTMLElement) => [...listCard(root, 'Governance').querySelectorAll('.bg-muted')].map(s => s.textContent!.replace(/ /g, ' '))
const shownRows = (root: HTMLElement) => listRows(root, 'Governance').filter(r => r.checkVisibility() && within(r).queryAllByRole('link', {name: /^#\d+$/}).length > 0)
const sideBySide = () => matchMedia('(min-width: 64rem)').matches

// side by side the card stays as tall as the activity card, a strip taking one row's place
export function expectLevel(root: HTMLElement, rowsLeft: number, rowsNarrow = 5) {
    if (!sideBySide()) return expect(shownRows(root)).toHaveLength(rowsNarrow)
    expect(listCard(root, 'Governance').getBoundingClientRect().height).toBe(listCard(root, 'Activity').getBoundingClientRect().height)
    expect(shownRows(root)).toHaveLength(rowsLeft)
}
