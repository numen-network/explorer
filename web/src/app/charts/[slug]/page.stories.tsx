import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor, within} from 'storybook/test'
import {chartBySlug} from '@/lib/charts'
import {HEAD, numn} from '../../../../../mock/fixtures.js'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {axesLegible, categoriesIn, expectLegibleAxes, expectNamedNavs, lastTooltipLines, lonePointsPainted, tooltipsInView} from '../../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import ChartPage from './page'

export default {title: 'Pages/Charts', ...pageMeta(ChartPage)}

type Day = (typeof DAILY)[number]
type Play = NonNullable<StoryObj['play']>

// a line through a single day has no segment to draw, so the day shows as a dot
const oneDayLine: StoryObj['play'] = async context => {
    await waitFor(() => expectLegibleAxes(context.canvasElement))
    await lonePointsPainted(context)
}

const chart = (slug: string, days: Day[], searchParams = {}): StoryObj => ({
    ...pageStory({dailyStats: days}, {params: {slug}, searchParams}),
    play: days.length ? (days.length === 1 && chartBySlug(slug)!.kind === 'line' ? oneDayLine : axesLegible) : undefined,
})

const NONE: Day[] = []
const FIRST = DAILY.slice(0, 1)

// the page asks for every day on or after this one when a preset range is picked
const after = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
const since = (days: number) => DAILY.filter(d => d.id >= after(days))
const between = (from: string, to: string) => DAILY.filter(d => d.id >= from && d.id <= to)

export const BlocksEmpty = chart('blocks', NONE)
export const BlocksOneDay = chart('blocks', FIRST)
export const BlocksManyDays = chart('blocks', DAILY)

export const BlockTimeEmpty = chart('block-time', NONE)
export const BlockTimeOneDay = chart('block-time', FIRST)
export const BlockTimeManyDays = chart('block-time', DAILY)

export const DifficultyEmpty = chart('difficulty', NONE)
export const DifficultyOneDay = chart('difficulty', FIRST)
export const DifficultyManyDays = chart('difficulty', DAILY)

export const MinersEmpty = chart('miners', NONE)
export const MinersOneDay = chart('miners', FIRST)
export const MinersManyDays = chart('miners', DAILY)

export const BlockRewardsEmpty = chart('block-rewards', NONE)
export const BlockRewardsOneDay = chart('block-rewards', FIRST)
export const BlockRewardsManyDays = chart('block-rewards', DAILY)

export const ExtrinsicsEmpty = chart('extrinsics', NONE)
export const ExtrinsicsOneDay = chart('extrinsics', FIRST)
export const ExtrinsicsManyDays = chart('extrinsics', DAILY)

export const ExtrinsicsTotalEmpty = chart('extrinsics-total', NONE)
export const ExtrinsicsTotalOneDay = chart('extrinsics-total', FIRST)
export const ExtrinsicsTotalManyDays = chart('extrinsics-total', DAILY)

export const EvmTransactionsEmpty = chart('evm-transactions', NONE)
export const EvmTransactionsOneDay = chart('evm-transactions', FIRST)
export const EvmTransactionsManyDays = chart('evm-transactions', DAILY)

export const FeesEmpty = chart('fees', NONE)
export const FeesOneDay = chart('fees', FIRST)
export const FeesManyDays = chart('fees', DAILY)

export const TransfersEmpty = chart('transfers', NONE)
export const TransfersOneDay = chart('transfers', FIRST)
export const TransfersManyDays = chart('transfers', DAILY)

export const TransfersTotalEmpty = chart('transfers-total', NONE)
export const TransfersTotalOneDay = chart('transfers-total', FIRST)
export const TransfersTotalManyDays = chart('transfers-total', DAILY)

export const TransferVolumeEmpty = chart('transfer-volume', NONE)
export const TransferVolumeOneDay = chart('transfer-volume', FIRST)
export const TransferVolumeManyDays = chart('transfer-volume', DAILY)

export const TransferVolumeTotalEmpty = chart('transfer-volume-total', NONE)
export const TransferVolumeTotalOneDay = chart('transfer-volume-total', FIRST)
export const TransferVolumeTotalManyDays = chart('transfer-volume-total', DAILY)

export const AccountsEmpty = chart('accounts', NONE)
export const AccountsOneDay = chart('accounts', FIRST)
export const AccountsManyDays = chart('accounts', DAILY)

export const ReferendaEmpty = chart('referenda', NONE)
export const ReferendaOneDay = chart('referenda', FIRST)
export const ReferendaManyDays = chart('referenda', DAILY)

export const IssuanceEmpty = chart('issuance', NONE)
export const IssuanceOneDay = chart('issuance', FIRST)
export const IssuanceManyDays = chart('issuance', DAILY)

export const ActiveIssuanceEmpty = chart('active-issuance', NONE)
export const ActiveIssuanceOneDay = chart('active-issuance', FIRST)
export const ActiveIssuanceManyDays = chart('active-issuance', DAILY)

export const TransferableIssuanceEmpty = chart('transferable-issuance', NONE)
export const TransferableIssuanceOneDay = chart('transferable-issuance', FIRST)
export const TransferableIssuanceManyDays = chart('transferable-issuance', DAILY)

export const TreasuryEmpty = chart('treasury', NONE)
export const TreasuryOneDay = chart('treasury', FIRST)
export const TreasuryManyDays = chart('treasury', DAILY)

// the newest two days end exactly on the last digit a reading shows
export const BlockRewardsTruncationEdge: StoryObj = {
    ...chart('block-rewards', DAILY.map((d, i) => (i === DAILY.length - 2 ? {...d, rewards: numn(4.35)} : i === DAILY.length - 1 ? {...d, rewards: numn(1.15)} : d))),
    play: async ({canvas}) => {
        await expect(canvas.getByText(/^The latest value of Block Rewards is 1\.15 NUMN\./)).toBeInTheDocument()
    },
}

// a day of a thousand and one blocks, each the given milliseconds after the last
const paced = (d: Day, ms: number) => ({...d, blocks: 1_001, tsLast: new Date(Date.parse(d.tsFirst) + ms * 1_000).toISOString()})

// the newest day's blocks came 9.9961s apart and the day before's exactly 10s
export const BlockTimeTruncationEdge: StoryObj = {
    ...chart('block-time', [...DAILY.slice(0, -2), paced(DAILY.at(-2)!, 10_000), paced(DAILY.at(-1)!, 9_996.1)]),
    play: async ({canvas}) => {
        await expect(canvas.getByText('The latest value of Average Block Time is 9.99. Compared with the day before it is down by 0.03%.')).toBeInTheDocument()
    },
}

const checked = (story: StoryObj, check: Play): StoryObj => ({
    ...story,
    play: async context => {
        await story.play?.(context)
        await check(context)
    },
})

// one control in the header holds the pick, a preset or the date range
const preset =
    (label: string): Play =>
    async ({canvas, canvasElement}) => {
        expectNamedNavs(canvasElement)
        await expect(within(canvas.getByRole('navigation', {name: 'Range'})).getByRole('link', {current: 'page'})).toHaveTextContent(label)
        await expect(canvas.getByRole('button', {name: 'Any date'})).toHaveAttribute('data-active', 'false')
    }

const custom =
    (range: string): Play =>
    async ({canvas}) => {
        await expect(within(canvas.getByRole('navigation', {name: 'Range'})).queryByRole('link', {current: 'page'})).toBeNull()
        await expect(canvas.getByRole('button', {name: range})).toHaveAttribute('data-active', 'true')
    }

export const RangeLast30Days = checked(chart('transfers', since(30), {r: '30'}), preset('30D'))
export const RangeLast90Days = checked(chart('transfers', since(90), {r: '90'}), preset('90D'))
export const RangeAll = checked(chart('transfers', DAILY, {r: 'all'}), preset('ALL'))

// the index stopped at the last block of a day sixty days back, so the 30 days
// run back from that block
const STALE = DAILY.at(-61)!
export const RangeLast30DaysIndexBehind = checked(
    {
        ...pageStory(
            {
                blocks: () => [{height: HEAD - 60 * 8_640, timestamp: `${STALE.id}T23:59:50.000Z`}],
                dailyStats: ({where}: {where?: {date_gte?: string}}) => DAILY.filter(d => d.id <= STALE.id && d.date >= (where?.date_gte ?? '')),
            },
            {params: {slug: 'transfers'}, searchParams: {r: '30'}}
        ),
        play: axesLegible,
    },
    async ({canvasElement}) => {
        const [days] = categoriesIn(canvasElement)
        await expect(days).toHaveLength(31)
        await expect(days.at(-1)).toBe(STALE.id)
    }
)

const FROM = DAILY[40].id
const TO = DAILY[60].id

export const RangeCustom = checked(chart('issuance', between(FROM, TO), {after: FROM, before: TO}), custom(`${FROM} to ${TO}`))
export const RangeCustomFromOnly = checked(chart('issuance', DAILY.filter(d => d.id >= TO), {after: TO}), custom(`${TO} to …`))
export const RangeCustomToOnly = checked(chart('issuance', DAILY.filter(d => d.id <= FROM), {before: FROM}), custom(`… to ${FROM}`))
export const RangeCustomOneDay = checked(chart('issuance', between(FROM, FROM), {after: FROM, before: FROM}), custom(`${FROM} to ${FROM}`))

// a bad day in the url sets no bound, impossible dates like 2026-02-30 included
export const RangeCustomInvalidFrom = checked(chart('issuance', DAILY.filter(d => d.id <= FROM), {after: 'yesterday', before: FROM}), custom(`… to ${FROM}`))
export const RangeCustomInvalidTo = checked(chart('issuance', DAILY.filter(d => d.id >= TO), {after: TO, before: '2026-02-30'}), custom(`${TO} to …`))
export const RangeCustomInvalidBoth = checked(chart('issuance', since(365), {after: '2026-13-45', before: 'today'}), preset('365D'))

export const EvmTransactionsAfterQuietDay = chart('evm-transactions', DAILY.map((d, i) => (i === DAILY.length - 2 ? {...d, evmTxs: 0} : d)))

export const EvmTransactionsAllZero = chart('evm-transactions', DAILY.map(d => ({...d, evmTxs: 0})))

export const DifficultyExtreme = chart('difficulty', DAILY.map(d => ({...d, difficultyClose: String(BigInt(d.difficultyClose) * 200_000n)})))

// the newest two days climb from just under a quintillion to just over it,
// where a float no longer tells neighbouring integers apart
const quintillions = DAILY.map(d => ({...d, difficultyClose: String(BigInt(d.difficultyClose) * 200_000_000n)}))
const pastQuintillion = [...quintillions.slice(0, -2), {...quintillions.at(-2)!, difficultyClose: '999999999999999999'}, {...quintillions.at(-1)!, difficultyClose: '1000000000000000001'}]

export const DifficultyPastFloat = checked(chart('difficulty', pastQuintillion), async ({canvas, canvasElement}) => {
    await expect(canvas.getByText('The latest value of Difficulty is 1,000,000,000,000,000,001. Compared with the day before it is up by <0.01%.')).toBeInTheDocument()
    expect(lastTooltipLines(canvasElement)[0]).toContain('1,000,000,000,000,000,001')
})

// issuance near ten billion coins, more millionths of a coin than a float
// holds exactly, the newest day one planck short of ten billion
const tenBillions = DAILY.map(d => ({...d, issuanceTotal: String(BigInt(d.issuanceTotal) + 9_397_000_000n * 10n ** 18n)}))
const justUnderTenBillion = [...tenBillions.slice(0, -1), {...tenBillions.at(-1)!, issuanceTotal: '9999999999999999999999999999'}]

export const IssuancePastFloat = checked(chart('issuance', justUnderTenBillion), async ({canvas, canvasElement}) => {
    await expect(canvas.getByText(/^The latest value of Total Issuance is ≈9\.99B NUMN\./)).toBeInTheDocument()
    expect(lastTooltipLines(canvasElement)[0]).toContain('≈9.99B NUMN')
})

// the newest day's fees are exactly a tenth over the day before's, down to a
// digit past the millionth of a coin
const feesUpATenth = [...DAILY.slice(0, -2), {...DAILY.at(-2)!, fees: '3000001000000000000'}, {...DAILY.at(-1)!, fees: '3300001100000000000'}]

export const FeesChangeEdge = checked(chart('fees', feesUpATenth), async ({canvas}) => {
    await expect(canvas.getByText('The latest value of Transaction Fees is ≈3.3 NUMN. Compared with the day before it is up by 10.00%.')).toBeInTheDocument()
})

// the newest day's pot cut short and the day before's whole
const potUp = [...DAILY.slice(0, -2), {...DAILY.at(-2)!, treasuryPot: numn(21_000_000)}, {...DAILY.at(-1)!, treasuryPot: numn(52_513_000)}]

export const TreasuryShortForm = checked(chart('treasury', potUp), async ({canvas, canvasElement}) => {
    await expect(canvas.getByText('The latest value of Treasury Pot is ≈52.51M NUMN. Compared with the day before it is up by 150.06%.')).toBeInTheDocument()
    expect(lastTooltipLines(canvasElement)[0]).toContain('≈52.51M NUMN')
})

// the newest day's blocks came 10.1s apart and the day before's exactly 10s
export const BlockTimeChangeEdge = checked(chart('block-time', [...DAILY.slice(0, -2), paced(DAILY.at(-2)!, 10_000), paced(DAILY.at(-1)!, 10_100)]), async ({canvas}) => {
    await expect(canvas.getByText('The latest value of Average Block Time is 10.10. Compared with the day before it is up by 1.00%.')).toBeInTheDocument()
})

// a nine digit NUMN reading makes the widest tooltip a chart shows
export const IssuanceManyDaysTooltip: StoryObj = {...IssuanceManyDays, play: tooltipsInView}
export const IssuanceOneDayTooltip: StoryObj = {...IssuanceOneDay, play: tooltipsInView}
