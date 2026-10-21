import {expect, waitFor, within} from 'storybook/test'
import {numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {standard} from '../../../../../mock/fixtures/governance.js'
import {axisTexts, barWidthsIn, expectFits, expectLegibleAxes, stacksIn} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {story, curatedCase, cast, withPlay, deciding, single, singleVote, everyAction, convictionVotes, manyVotes, many, delegatedVotes, delegatedRef, fewAndMany, extremeAmounts} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Statistics', ...pageMeta(ReferendumPage)}

// the statistics tab as the page draws it, the list legend, the three totals,
// the conviction shares, every stacked chart once it has drawn its totals and
// the widths its bars take
const statistics = async (root: HTMLElement) => {
    await waitFor(() => {
        const stacks = stacksIn(root)
        expect(stacks).toHaveLength(5)
        for (const stack of stacks) expect(stack.totals).toHaveLength(stack.labels.length)
    })
    const sections = root.querySelectorAll('[data-slot=card] section')
    const [ways, capital, votes, levels, ranges] = stacksIn(root)
    return {
        legend: [...within(root).getByRole('heading', {name: 'Statistics'}).nextElementSibling!.children].map(el => el.textContent),
        totals: [...sections[0].children].map(el => [el.children[0].textContent, el.children[1].textContent]),
        shares: within(root).getAllByRole('listitem').filter(el => el.closest('ul')?.getAttribute('aria-label') === 'Conviction shares').map(el => el.textContent),
        ways,
        capital: capital.totals,
        votes: votes.totals,
        levels,
        ranges,
        // the range labels the last chart draws, a crowded one broken after its dash
        drawnRanges: axisTexts(root)
            .at(-1)!
            .find(axis => axis.length === ranges.labels.length)
            ?.map(text => text.replace('\n', '')),
        barWidths: barWidthsIn(root),
    }
}

const WAYS = ['Delegated', 'Direct']
const LEVELS = ['0.1x', '1x', '2x', '3x', '4x', '5x', '6x']
const RANGES = ['0-10K', '10K-500K', '500K-1M', '1M-5M', '>5M']
const shares = (pcts: string[]) => pcts.map((pct, n) => `${LEVELS[n]}${pct}`)

export const Empty = withPlay(curatedCase(7, 'statistics'), async ({canvas}) => {
    await expect(await canvas.findByText('No votes yet.')).toBeInTheDocument()
})

export const One = withPlay(cast(single, singleVote, 'statistics'), async ({canvasElement}) => {
    await expect(await statistics(canvasElement)).toEqual({
        legend: ['Aye', 'Nay', 'Abstain'],
        totals: [
            ['Accounts', '1'],
            ['Capital', '1M NUMN'],
            ['Votes', '3M NUMN'],
        ],
        shares: shares(['0.00%', '0.00%', '0.00%', '100.00%', '0.00%', '0.00%', '0.00%']),
        ways: {labels: WAYS, series: {Aye: [0, 1], Nay: [0, 0], Abstain: [0, 0]}, totals: ['0', '1']},
        capital: ['0', '1M'],
        votes: ['0', '3M'],
        levels: {labels: LEVELS, series: {Aye: [0, 0, 0, 1, 0, 0, 0], Nay: [0, 0, 0, 0, 0, 0, 0], Abstain: [0, 0, 0, 0, 0, 0, 0]}, totals: ['0', '0', '0', '1', '0', '0', '0']},
        ranges: {labels: RANGES, series: {Aye: [0, 0, 0, 1, 0], Nay: [0, 0, 0, 0, 0], Abstain: [0, 0, 0, 0, 0]}, totals: ['0', '0', '0', '1', '0']},
        drawnRanges: RANGES,
        barWidths: [14],
    })
})

// a standard vote each way, a split, a split abstain and a delegation riding
// alice's aye, the split giving the legend its fourth list
export const EveryKind = withPlay(story(everyAction.referendum, 'statistics', everyAction.data), async ({canvasElement}) => {
    await expect(await statistics(canvasElement)).toEqual({
        legend: ['Aye', 'Nay', 'Abstain', 'Split'],
        totals: [
            ['Accounts', '5'],
            ['Capital', '1.14M NUMN'],
            ['Votes', '≈2.33M NUMN'],
        ],
        shares: shares(['40.00%', '0.00%', '20.00%', '0.00%', '20.00%', '0.00%', '20.00%']),
        ways: {labels: WAYS, series: {Aye: [1, 1], Nay: [0, 1], Abstain: [0, 1], Split: [0, 1]}, totals: ['1', '4']},
        capital: ['50K', '1.09M'],
        votes: ['300K', '≈2.03M'],
        levels: {
            labels: LEVELS,
            series: {Aye: [0, 0, 1, 0, 0, 0, 1], Nay: [0, 0, 0, 0, 1, 0, 0], Abstain: [1, 0, 0, 0, 0, 0, 0], Split: [1, 0, 0, 0, 0, 0, 0]},
            totals: ['2', '0', '1', '0', '1', '0', '1'],
        },
        ranges: {labels: RANGES, series: {Aye: [0, 1, 1, 0, 0], Nay: [0, 0, 0, 1, 0], Abstain: [0, 1, 0, 0, 0], Split: [0, 1, 0, 0, 0]}, totals: ['0', '3', '1', '1', '0']},
        drawnRanges: RANGES,
        barWidths: [14],
    })
})

// one aye and one nay at each conviction
export const EveryConviction = withPlay(cast(deciding(20, 'Votes at every conviction from 0x to 6x'), convictionVotes, 'statistics'), async ({canvasElement}) => {
    const {totals, shares: held, levels} = await statistics(canvasElement)
    await expect(totals[0]).toEqual(['Accounts', '14'])
    await expect(held).toEqual(shares(Array(7).fill('14.28%')))
    await expect(levels).toEqual({labels: LEVELS, series: {Aye: Array(7).fill(1), Nay: Array(7).fill(1), Abstain: Array(7).fill(0)}, totals: Array(7).fill('2')})
})

// every chart counts all 312 voters once
export const Many = withPlay(cast(many, manyVotes, 'statistics'), async ({canvasElement}) => {
    const {legend, totals, ways, levels, ranges} = await statistics(canvasElement)
    await expect(legend).toEqual(['Aye', 'Nay', 'Abstain', 'Split'])
    await expect(totals[0]).toEqual(['Accounts', '312'])
    for (const stack of [ways, levels, ranges]) await expect(stack.totals.reduce((n, t) => n + Number(t), 0)).toBe(312)
})

// sixteen delegators behind two of three aye voters
export const Delegated = withPlay(cast(delegatedRef, delegatedVotes, 'statistics', {}, fewAndMany), async ({canvasElement}) => {
    const {totals, ways} = await statistics(canvasElement)
    await expect(totals[0]).toEqual(['Accounts', '19'])
    await expect(ways).toEqual({labels: WAYS, series: {Aye: [16, 3], Nay: [0, 0], Abstain: [0, 0]}, totals: ['16', '3']})
})

// votes of nothing still count as accounts and sit in the lowest range
export const ZeroBalance = withPlay(
    cast(
        deciding(25, 'Two votes of nothing beside one real one'),
        [
            {...standard(PEOPLE[0], true, 'Locked1x', '0'), block: 952_000},
            {...standard(PEOPLE[1], false, 'None', '0'), block: 953_000},
            {...standard(PEOPLE[2], true, 'Locked3x', numn(20_000)), block: 954_000},
        ],
        'statistics'
    ),
    async ({canvasElement}) => {
        const {totals, ranges} = await statistics(canvasElement)
        await expect(totals).toEqual([
            ['Accounts', '3'],
            ['Capital', '20K NUMN'],
            ['Votes', '60K NUMN'],
        ])
        await expect(ranges).toEqual({labels: RANGES, series: {Aye: [1, 1, 0, 0, 0], Nay: [1, 0, 0, 0, 0], Abstain: [0, 0, 0, 0, 0]}, totals: ['2', '1', '0', '0', '0']})
    }
)

// 52M of aye against ten planck of nay, the tab fits every width
export const ExtremeAmounts = withPlay(extremeAmounts('statistics'), async ({canvas, canvasElement}) => {
    const {totals, ranges} = await statistics(canvasElement)
    await expect(totals).toEqual([
        ['Accounts', '2'],
        ['Capital', '≈52M NUMN'],
        ['Votes', '≈52M NUMN'],
    ])
    await expect(ranges.totals).toEqual(['1', '0', '0', '0', '1'])
    const tab = canvas.getByRole('tabpanel')
    expectFits(...tab.querySelectorAll('[data-slot=card]'))
    expectLegibleAxes(tab)
})
