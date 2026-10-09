import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {account, acct, chainInfo, HEAD_TIME, identity, numn, person} from '../../../../mock/fixtures.js'
import {expectAddressForm} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import MinersPage from './page'

export default {title: 'Pages/Miners', ...pageMeta(MinersPage)}

const DAY_MS = 86_400_000
const REWARD = 150
const U128_MAX = (2n ** 128n - 1n).toString()
const INT_MAX = 2 ** 31 - 1
const WIDEST = acct(98, identity('W'.repeat(32), {judgements: ['KnownGood']}))

const miner = (n: number) => ({...person(n), id: account(60 + n)})
const dayAgo = (daysAgo: number) => new Date(HEAD_TIME - daysAgo * DAY_MS).toISOString().slice(0, 10)
const minerDay = (who: object, daysAgo: number, blocks: number, rewards = numn(blocks * REWARD)) => ({day: dayAgo(daysAgo), blocks, rewards, account: who})

// one row per miner and day, the page sums them per miner
const dailyRows = (dayCount: number, minerCount: number) =>
    Array.from({length: dayCount}, (_, d) => Array.from({length: minerCount}, (_, m) => minerDay(miner(m), d, 700 - m * 55 + (d % 7) * 9))).flat()

const minersIn = (w: string, rows: object[]) => pageStory({minerDayStats: rows}, {searchParams: {w}})

export const MinersEmpty = minersIn('24h', [])

export const MinersOne = minersIn('24h', [minerDay(miner(0), 0, 4_210)])

export const MinersMany = minersIn('24h', Array.from({length: 40}, (_, i) => minerDay(miner(i), 0, 340 - i * 8)))

export const MinersWeek: StoryObj = {...minersIn('7d', dailyRows(7, 12)), play: async ({canvasElement}) => expectAddressForm(canvasElement)}

export const MinersMonth = minersIn('30d', dailyRows(30, 12))

// one miner holds every block but one, the other holds that one
export const MinersExtremeCounts: StoryObj = {
    ...minersIn('24h', [minerDay(WIDEST, 0, INT_MAX, U128_MAX), minerDay(WIDEST, 1, INT_MAX), minerDay(miner(2), 0, 1, '0')]),
    play: async ({canvasElement}) => {
        const shares = [...canvasElement.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(row => row.cells[3].textContent)
        await expect(shares).toEqual(['99.99%', '<0.01%'])
    },
}

// mainnet rebuilding from genesis, indexed to #5,589 of #220,095 with every
// block so far mined on 2026-09-14 at 16 NUMN each. the database matches no
// day against a null start
const REBUILT = [1_989, 1_143, 1_096, 912, 293, 82, 37, 11, 7, 6, 3, 3, 2, 2, 1, 1, 1]
const rebuiltRows = REBUILT.map((blocks, i) => ({day: '2026-09-14', blocks, rewards: numn(blocks * 16), account: miner(i)}))

// the window runs back from the newest indexed block, not from today
export const MinersIndexBehind: StoryObj = {
    ...pageStory(
        {
            chainInfos: [{...chainInfo, head: 220_095, finalizedHead: 220_090}],
            blocks: () => [{height: 5_589, timestamp: '2026-09-14T11:33:41.000Z'}],
            minerDayStats: ({where}: {where: {day_gte: string | null}}) => rebuiltRows.filter(row => where.day_gte != null && row.day >= where.day_gte),
        },
        {searchParams: {w: '24h'}}
    ),
    play: async ({canvasElement}) => {
        const blocks = [...canvasElement.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(row => row.cells[2]?.textContent)
        await expect(blocks).toEqual(['1,989', '1,143', '1,096', '912', '293', '82', '37', '11', '7', '6', '3', '3', '2', '2', '1', '1', '1'])
    },
}
