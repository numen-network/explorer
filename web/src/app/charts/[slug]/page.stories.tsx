import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {numn} from '../../../../../mock/fixtures.js'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {axesLegible} from '../../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import ChartPage from './page'

export default {title: 'Pages/Charts', ...pageMeta(ChartPage)}

type Day = (typeof DAILY)[number]

const chart = (slug: string, days: Day[], searchParams = {}): StoryObj => ({...pageStory({dailyStats: days}, {params: {slug}, searchParams}), play: days.length ? axesLegible : undefined})

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

export const RangeLast30Days = chart('transfers', since(30), {r: '30'})
export const RangeLast90Days = chart('transfers', since(90), {r: '90'})
export const RangeAll = chart('transfers', DAILY, {r: 'all'})

const FROM = DAILY[40].id
const TO = DAILY[60].id

export const RangeCustom = chart('issuance', between(FROM, TO), {after: FROM, before: TO})
export const RangeCustomFromOnly = chart('issuance', DAILY.filter(d => d.id >= TO), {after: TO})
export const RangeCustomToOnly = chart('issuance', DAILY.filter(d => d.id <= FROM), {before: FROM})

export const EvmTransactionsAfterQuietDay = chart('evm-transactions', DAILY.map((d, i) => (i === DAILY.length - 2 ? {...d, evmTxs: 0} : d)))

export const EvmTransactionsAllZero = chart('evm-transactions', DAILY.map(d => ({...d, evmTxs: 0})))

export const DifficultyExtreme = chart('difficulty', DAILY.map(d => ({...d, difficultyClose: String(BigInt(d.difficultyClose) * 200_000n)})))
