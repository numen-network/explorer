import {account, acct, HEAD_TIME, identity, numn, person} from '../../../../mock/fixtures.js'
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

export const MinersWeek = minersIn('7d', dailyRows(7, 12))

export const MinersMonth = minersIn('30d', dailyRows(30, 12))

export const MinersExtremeCounts = minersIn('24h', [minerDay(WIDEST, 0, INT_MAX, U128_MAX), minerDay(WIDEST, 1, INT_MAX), minerDay(miner(2), 0, 1, '0')])
