import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, waitFor, within} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
import {minedObject, topology} from '../../../mock/fixtures/blocks.js'
import {DAILY, chainDays} from '../../../mock/fixtures/home.js'
import {HEAD, HEAD_TIME, PEOPLE, block, chainInfo, numn, transfer} from '../../../mock/fixtures.js'
import {all, axesLegible, type Play, drawnCanvases, drawnFaces, expectFits, expectInContentBox, expectLegibleAxes, expectNoHangingDots, expectOneLine, expectTimesFit, lastTooltipLines, lonePointsPainted, tooltipsInView} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'

export default {title: 'Pages/Home', ...pageMeta(Home)}

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

function home({head, best = head, finalized = Math.max(0, best - 5), days, objects = [], transfers = [], referendums = [], validators = 4, windows = {}, sessionLength = chainInfo.sessionLength}: Scene) {
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
const minedUpTo = (head: number, count: number, finalized = head - 5, traits: (height: number) => object = () => ({})) =>
    Array.from({length: Math.min(count, head)}, (_, i) => head - i).map(height => ({
        block: block(height, {timestamp: timeAt(head, height), finalized: height <= finalized, ...traits(height)}),
        protocol: PROTOCOL,
    }))

const TREASURY = {id: chainInfo.treasuryAccount, identityDisplay: null}

// only genesis is indexed, with no timestamp and no validator row
export const HomeEmpty: StoryObj = {
    ...pageStory(home({head: 0, days: [], validators: 0})),
    play: async ({canvas}) => {
        for (const text of ['No mined blocks yet.', 'No transfers yet.', 'No referenda yet.']) await expect(canvas.getByText(text)).toBeInTheDocument()
        await expect(canvas.getByText('Session').nextElementSibling).toHaveTextContent(/^—$/)
    },
}

// how much of the day has passed follows the clock, so the two plotted counts are pinned apart
const freshDay = {...chainDays(1_234).at(-1)!, transfers: 12, transferVolume: numn(1_050)}

export const FreshChain: StoryObj = {...pageStory(home({head: 1_234, days: [freshDay], objects: minedUpTo(1_234, 5)})), play: lonePointsPainted}

const firstDay = chainDays(1)[0]

export const HomeOne: StoryObj = {
    ...pageStory(
        home({
            head: 1,
            days: [{...firstDay, blocks: 2, extrinsicsSigned: 2, transfers: 1, transferVolume: numn(17), cumExtrinsicsSigned: '2', cumTransfers: '1', cumTransferVolume: numn(17), referendaTotal: 1, accountsTotal: 13}],
            objects: minedUpTo(1, 5),
            transfers: [transfer(1, 1, {amount: numn(17), timestamp: timeAt(1, 1)})],
            referendums: [{...referenda[2], id: '0', index: 0, submittedAt: 1, submittedTimestamp: timeAt(1, 1)}],
        })
    ),
    play: lonePointsPainted,
}

const MANY_FINALIZED = HEAD - 2

const manyTransfers = [
    transfer(HEAD, 2),
    transfer(HEAD - 3, 1, {from: TREASURY, call: null, extrinsic: null}),
    transfer(HEAD - 9, 4, {call: {pallet: 'Balances', method: 'transfer_allow_death'}}),
    transfer(HEAD - 15, 3),
    transfer(HEAD - 22, 1),
]

// DAILY rolls with the clock, so the chip the story checks reads a fixed window
const many = {head: HEAD, finalized: MANY_FINALIZED, days: DAILY, objects: minedUpTo(HEAD, 5, MANY_FINALIZED), transfers: manyTransfers, referendums: referenda.slice(4, 9), windows: {extrinsics: [89_181, 1_139, 33_800] satisfies Window}}

const homeFits: Play = async ({canvasElement}) => {
    expectBlockCardsFit(canvasElement)
    expectListsFit(canvasElement)
    expectTimesFit(canvasElement)
}

// each block card keeps its object clear of the padding and its protocol on one line
const railObjectsFit: Play = async ({canvasElement}) => {
    const rail = within(canvasElement).getByRole('heading', {name: 'Latest blocks'}).closest('section')!
    for (const object of await drawnCanvases(rail, 5)) expectInContentBox(object.closest('[data-slot=card]')!, object)
    expectOneLine(...within(rail).getAllByText(PROTOCOL))
}

// a chip under ten thousand groups its digits like the tile value above it
export const HomeMany: StoryObj = {
    ...pageStory(home(many)),
    play: all(
        async context => {
            await axesLegible(context)
            await expect(context.canvas.getByText('+1,139')).toBeVisible()
        },
        homeFits,
        railObjectsFit
    ),
}

// a crowded transfer row keeps its amount whole and cuts its call short, a
// crowded referendum row squeezes its title and wraps its facts, rather than overflowing
function expectListsFit(root: HTMLElement) {
    const rows = (heading: string) => [...within(root).getByRole('heading', {name: heading}).parentElement!.nextElementSibling!.children] as HTMLElement[]
    expectFits(...rows('Transfers'), ...rows('Referenda').flatMap(row => [row, ...row.querySelectorAll(':scope > * > *')]))
    expectOneLine(...rows('Transfers').map(row => within(row).getByText(/ NUMN$/)))
}

// every block card keeps its rows inside the card, its miner on one line and
// each count whole, with no line ending on a middle dot. a miner's name
// truncates on its own, its link reaching past the row for a wider hover
function expectBlockCardsFit(root: HTMLElement) {
    const rail = within(root).getByRole('heading', {name: 'Latest blocks'}).closest('section')!
    const cards = [...rail.querySelectorAll<HTMLElement>('[data-slot=card]')]
    const miners: Element[] = cards.map(card => within(card).getByText('Miner').parentElement!)
    expectFits(...cards.flatMap(card => [...card.children]).filter(row => !miners.includes(row)))
    expectOneLine(...miners, ...within(rail).getAllByText(/^(Extrinsics|Events) /))
    expectNoHangingDots(rail)
}

// an upgrade moved mining onto poscan-v2 two blocks ago, so the rail mixes
// objects of both protocols and each draws on its own protocol's topology
const [V1, V2] = [topology(PROTOCOL), topology('poscan-v2')]
const mixed = minedUpTo(HEAD, 5, MANY_FINALIZED).map((o, i) => ({...o, ...minedObject(o.block.height, i < 2 ? V2.id : V1.id)}))

export const HomeMixedProtocols: StoryObj = {
    ...pageStory({...home({...many, objects: mixed}), meshTopologies: [V1, V2]}),
    play: async ({canvas, canvasElement}) => {
        const rail = within(canvasElement).getByRole('heading', {name: 'Latest blocks'}).closest('section')!
        await expect(await drawnFaces(rail, 5)).toEqual([V2, V2, V1, V1, V1].map(t => t.faceCount))
        await expect(canvas.getByText('PoScan protocol').nextElementSibling).toHaveTextContent(V2.id)
    },
}

export const HomeChartTooltip: StoryObj = {...HomeMany, play: tooltipsInView}

export const HomeReferendumTitleHovered: StoryObj = {
    ...HomeMany,
    play: async ({canvas, userEvent}) => {
        const title = canvas.getByText(/deliberately long title/)
        expect(title.scrollWidth).toBeGreaterThan(title.clientWidth)
        await userEvent.hover(title)
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(title.textContent!)
    },
}

const undecoded = {...referenda[3], id: '12', index: 12, title: null, proposalPallet: null, proposalMethod: null, proposalCalls: null, proposalAmount: null, proposalBeneficiary: null}

export const HomeReferendaEnded = pageStory(home({...many, referendums: [undecoded, referenda[0], referenda[1], referenda[9], referenda[10]]}))

export const HomeIndexing = pageStory(home({...many, best: HEAD + 4_000, finalized: HEAD + 3_998}))

// mainnet rebuilding from genesis, indexed to #30,979 while the chain stood at
// #220,176, every figure on the page reads #30,979
export const HomeIndexBehind: StoryObj = {
    ...pageStory(home({head: 30_979, best: 220_176, finalized: 220_174, days: chainDays(30_979), objects: minedUpTo(30_979, 5, 220_174)})),
    play: async ({canvas}) => {
        const row = (label: string) => canvas.getByText(label, {selector: 'dt'}).nextElementSibling!
        await expect(row('Latest block')).toHaveTextContent(/^30,979$/)
        await expect(row('Latest block').querySelector('a')).toHaveAttribute('href', '/block/30979')
        await expect(row('Finalized')).toHaveTextContent(/^30,979$/)
        await expect(row('Session')).toHaveTextContent(/^#516$/)
        await expect(canvas.getByText('Block 20 / 60')).toBeInTheDocument()
    },
}

// every move ends exactly on the last digit its chip shows, but the day's
// difficulty moves by a sliver and the day's blocks came 9.96s apart
const latest = DAILY.at(-1)!
const plus = (planck: string, n: number) => String(BigInt(planck) + BigInt(numn(n)))
const edgeToday = {
    ...latest,
    issuanceTotal: plus(latest.issuanceTotal, 0.3),
    difficultyClose: '4350000000',
    blocks: 1_001,
    tsLast: new Date(Date.parse(latest.tsFirst) + 9_960_000).toISOString(),
}
const edgeDays = [
    ...DAILY.slice(0, -31),
    {
        ...DAILY.at(-31)!,
        difficultyClose: '4000000000',
        issuanceTotal: plus(edgeToday.issuanceTotal, -1_150_000),
        issuanceInactive: latest.issuanceInactive,
        issuanceTransferable: plus(latest.issuanceTransferable, -8_200_000),
        treasuryPot: plus(latest.treasuryPot, -5_100_000),
    },
    ...DAILY.slice(-30, -2),
    {
        ...DAILY.at(-2)!,
        difficultyClose: '4350000001',
        issuanceTotal: plus(latest.issuanceTotal, 0.1),
        issuanceInactive: latest.issuanceInactive,
        issuanceTransferable: plus(latest.issuanceTransferable, 2.01),
        treasuryPot: plus(latest.treasuryPot, 1.15),
    },
    edgeToday,
]

export const HomeTruncationEdges: StoryObj = {
    ...pageStory(
        home({
            ...many,
            days: edgeDays,
            referendums: [{...referenda[4], id: '30', index: 30, proposalAmount: '9999999999999999999999999999'}],
            windows: {transfers: [0, 1_150_000, 4_350_000], extrinsics: [0, 8_200_000, 5_100_000], miners: [2_010_000, 7, 290_000]},
        })
    ),
    play: all(homeFits, async ({canvasElement}) => {
        const tile = (chart: string) => canvasElement.querySelector(`a[href="/charts/${chart}"]`)!.closest('[data-slot=card]')!
        const chips = (chart: string) => [...tile(chart).querySelectorAll('[data-slot=card-content] > span')].map(chip => chip.textContent)
        await expect(chips('transfers-total')).toEqual(['+1.15M · 24h', '+4.35M · 30d'])
        await expect(chips('extrinsics-total')).toEqual(['+8.2M · 24h', '+5.1M · 30d'])
        await expect(chips('miners')).toEqual(['290K · 30d', '2.01M · total'])
        await expect(chips('issuance')).toEqual(['+0.2 · 24h', '+1.15M · 30d'])
        await expect(chips('active-issuance')).toEqual(['+0.2 · 24h', '+1.15M · 30d'])
        await expect(chips('transferable-issuance')).toEqual(['−2.01 · 24h', '+8.2M · 30d'])
        await expect(chips('treasury')).toEqual(['−1.15 · 24h', '+5.1M · 30d'])
        await expect(tile('difficulty').querySelector('[data-slot=card-title]')).toHaveTextContent('4.35B')
        await expect(chips('difficulty')).toEqual(['−<0.01% · 24h', '+8.75% · 30d'])
        await expect(within(canvasElement).getByText('Avg block time').nextElementSibling).toHaveTextContent('9.9s')
        await expect(within(canvasElement).getByText('9,999,999,999 NUMN')).toBeInTheDocument()
    }),
}

// difficulty a whisker under a quintillion, one up on the day before and a
// ninth up on the month before, where a float no longer tells neighbouring
// integers apart, and the day's volume a hair under ten billion coins, which a
// float takes for ten billion
const pastFloatDays = [
    ...DAILY.slice(0, -31),
    {...DAILY.at(-31)!, difficultyClose: '900000000000000000'},
    ...DAILY.slice(-30, -2),
    {...DAILY.at(-2)!, difficultyClose: '999999999999999998'},
    {...DAILY.at(-1)!, difficultyClose: '999999999999999999', transferVolume: '9999999999999999999999999999'},
]

export const HomePastFloat: StoryObj = {
    ...pageStory(home({...many, days: pastFloatDays})),
    play: async ({canvasElement}) => {
        const tile = canvasElement.querySelector('a[href="/charts/difficulty"]')!.closest('[data-slot=card]')!
        await expect(tile.querySelector('[data-slot=card-title]')).toHaveTextContent('999P')
        await expect([...tile.querySelectorAll('[data-slot=card-content] > span')].map(chip => chip.textContent)).toEqual(['+<0.01% · 24h', '+11.11% · 30d'])
        await waitFor(() => expectLegibleAxes(canvasElement))
        expect(lastTooltipLines(canvasElement)[0].join('')).toContain('Volume (NUMN)≈9.99B')
    },
}

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

export const HomeExtremes: StoryObj = {
    ...pageStory(
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
            sessionLength: 14_400,
            windows: {
                accounts: [1_234_567_890, 98_765_432, 987_654_321],
                miners: [2_147_483_647, 99_999, 1_000_000],
                extrinsics: [0, 9_876_543, 987_654_321],
                transfers: [0, 1_234_567, 123_456_789],
                evm: [2_147_483_647, 98_765_432, 987_654_321],
            },
        })
    ),
    play: all(homeFits, async ({canvas}) => {
        for (const count of ['Extrinsics 1,234', 'Events 98,765']) await expect(canvas.getAllByText(count)).toHaveLength(5)
        await expect(canvas.getByText('Block 1,522 / 14,400')).toBeVisible()
        await expect(canvas.getByText('Session length').nextElementSibling).toHaveTextContent('14,400 blocks')
    }),
}
