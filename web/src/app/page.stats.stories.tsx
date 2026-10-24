import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {DAILY} from '../../../mock/fixtures/home.js'
import {numn} from '../../../mock/fixtures.js'
import {all, type Play, expectFits, expectOneLine} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {far, home, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Stats', ...pageMeta(Home)}

// the stat drawn for a chart, a row of the list or a tile
const statOf = (root: HTMLElement, chart: string) =>
    [...root.querySelectorAll(`a[href="/charts/${chart}"]`)].find(link => link.checkVisibility())!.closest('[data-slot=stat-row], [data-slot=card]')!

const statsOf = (root: HTMLElement) => [...statOf(root, 'extrinsics-total').parentElement!.children]

const valueOf = (stat: Element) => stat.querySelector('[data-slot=card-title], [data-slot=stat-value]')

const chipsOf = (stat: Element) => [...stat.querySelectorAll('[data-slot=card-content] > span, [data-slot=stat-chips] > span')].map(chip => chip.textContent)

// each stat's figure and the line of chips under it
const linesOf = (stats: Element[]) => stats.flatMap(stat => [...stat.querySelectorAll('[data-slot=card-title], [data-slot=card-content], [data-slot=stat-value], [data-slot=stat-chips]')])

// a tile needs 256px to keep its figure and its widest chips on one line each, a row
// holds as many of those as fit and a box too narrow for two folds them into one list
const statsFit: Play = async ({canvasElement}) => {
    const stats = statsOf(canvasElement)
    expectOneLine(...linesOf(stats))
    const box = stats[0].parentElement!.parentElement!
    await expect(stats[0].matches('[data-slot=stat-row]')).toBe(box.clientWidth < 2 * 256 + 16)
}

// a chip under ten thousand groups its digits like the value above it
export const Many: StoryObj = {
    ...pageStory(home(many)),
    play: all(statsFit, async ({canvas}) => expect(canvas.getAllByText('+1,139').filter(chip => chip.checkVisibility())).toHaveLength(1)),
}

// every move ends exactly on the last digit its chip shows, but the day's
// difficulty moves by a sliver
const latest = DAILY.at(-1)!
const plus = (planck: string, n: number) => String(BigInt(planck) + BigInt(numn(n)))
const edgeToday = {...latest, issuanceTotal: plus(latest.issuanceTotal, 0.3), difficultyClose: '4350000000'}
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

export const TruncationEdges: StoryObj = {
    ...pageStory(home({...many, days: edgeDays, windows: {transfers: [0, 1_150_000, 4_350_000], extrinsics: [0, 8_200_000, 5_100_000], miners: [2_010_000, 7, 290_000]}})),
    play: async ({canvasElement}) => {
        const chips = (chart: string) => chipsOf(statOf(canvasElement, chart))
        await expect(chips('transfers-total')).toEqual(['+1.15M · 24h', '+4.35M · 30d'])
        await expect(chips('extrinsics-total')).toEqual(['+8.2M · 24h', '+5.1M · 30d'])
        await expect(chips('miners')).toEqual(['290K · 30d', '2.01M · total'])
        await expect(chips('issuance')).toEqual(['+0.2 · 24h', '+1.15M · 30d'])
        await expect(chips('active-issuance')).toEqual(['+0.2 · 24h', '+1.15M · 30d'])
        await expect(chips('transferable-issuance')).toEqual(['−2.01 · 24h', '+8.2M · 30d'])
        await expect(chips('treasury')).toEqual(['−1.15 · 24h', '+5.1M · 30d'])
        await expect(valueOf(statOf(canvasElement, 'difficulty'))).toHaveTextContent('4.35B')
        await expect(chips('difficulty')).toEqual(['<−0.01% · 24h', '+8.75% · 30d'])
    },
}

// difficulty a whisker under a quintillion, one up on the day before and a
// ninth up on the month before, where a float no longer tells neighbouring
// integers apart
const pastFloatDays = [
    ...DAILY.slice(0, -31),
    {...DAILY.at(-31)!, difficultyClose: '900000000000000000'},
    ...DAILY.slice(-30, -2),
    {...DAILY.at(-2)!, difficultyClose: '999999999999999998'},
    {...DAILY.at(-1)!, difficultyClose: '999999999999999999'},
]

export const PastFloat: StoryObj = {
    ...pageStory(home({...many, days: pastFloatDays})),
    play: async ({canvasElement}) => {
        const stat = statOf(canvasElement, 'difficulty')
        await expect(valueOf(stat)).toHaveTextContent('999P')
        await expect(chipsOf(stat)).toEqual(['<+0.01% · 24h', '+11.11% · 30d'])
    },
}

// the widest figure and chips each stat can be handed wrap inside it rather than run past it
export const Extremes: StoryObj = {
    ...pageStory(home(far)),
    play: async ({canvasElement}) => {
        const stats = statsOf(canvasElement)
        expectFits(...stats, ...linesOf(stats))
    },
}
