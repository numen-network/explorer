import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor, within} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
import {DAILY} from '../../../mock/fixtures/home.js'
import {numn} from '../../../mock/fixtures.js'
import {all, expectLegibleAxes, lastTooltipLines} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {home, many, homeFits} from './page.stories.helpers'

export default {title: 'Pages/Home/Stats', ...pageMeta(Home)}

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

export const TruncationEdges: StoryObj = {
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
        await expect(chips('difficulty')).toEqual(['<−0.01% · 24h', '+8.75% · 30d'])
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

export const PastFloat: StoryObj = {
    ...pageStory(home({...many, days: pastFloatDays})),
    play: async ({canvasElement}) => {
        const tile = canvasElement.querySelector('a[href="/charts/difficulty"]')!.closest('[data-slot=card]')!
        await expect(tile.querySelector('[data-slot=card-title]')).toHaveTextContent('999P')
        await expect([...tile.querySelectorAll('[data-slot=card-content] > span')].map(chip => chip.textContent)).toEqual(['<+0.01% · 24h', '+11.11% · 30d'])
        await waitFor(() => expectLegibleAxes(canvasElement))
        expect(lastTooltipLines(canvasElement)[0].join('')).toContain('Volume (NUMN)≈9.99B')
    },
}
