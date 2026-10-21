import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {funds, subject, SUBJECT} from '../../../../../mock/fixtures/accounts.js'
import {at, chainInfo, HEAD, numn} from '../../../../../mock/fixtures.js'
import {expectFits} from '../../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, Spec, build, story, lock, schedule, PARTIAL} from './page.stories.helpers'

export default {title: 'Pages/Account/Vesting', ...pageMeta(AccountPage), decorators: [wellKnown]}

// the index stopped at head while the chain ran on to best
const behind = (spec: Spec, head: {height: number; timestamp: string}, best: number, searchParams: Record<string, string> = {}) =>
    pageStory({...build(spec), chainInfos: [{...chainInfo, head: best, finalizedHead: best - 2}], blocks: () => [head]}, {params: {id: spec.account?.id ?? SUBJECT}, searchParams})

export const One = story({account: subject({...funds(numn(1_001_250.5), '0', numn(400_000)), vestingJson: [PARTIAL], locksJson: [lock('vesting', numn(400_000))]})}, {tab: 'vesting'})

// what vested since the last vest call is still in the lock, over a schedule yet to start, one under way and one paid out
export const ReleasableByVest: StoryObj = {
    ...story(
        {
            account: subject({
                ...funds(numn(1_171_250.5), '0', numn(700_000)),
                vestingJson: [schedule(120_000, 0.5, HEAD + 10_000), PARTIAL, schedule(50_000, 0.25, 100_000)],
                locksJson: [lock('vesting', numn(700_000))],
            }),
        },
        {tab: 'vesting'}
    ),
    play: async ({canvas}) => {
        await expect(canvas.findByText('520,000 NUMN')).resolves.toBeInTheDocument()
        expect(canvas.getByText('180,000 NUMN')).toBeInTheDocument()
    },
}

// full-precision mainnet amounts keep inside the schedule card at every width
export const FullPrecision: StoryObj = {
    ...story(
        {
            account: subject({
                ...funds('890433818381069939076252', '0', '889683335677682244209740'),
                vestingJson: [{locked: '890383818381069939076252', perBlock: '141169428332868776', startingBlock: 0}],
                locksJson: [lock('vesting', '889683335677682244209740')],
            }),
        },
        {tab: 'vesting'}
    ),
    play: async ({canvas, canvasElement}) => {
        await canvas.findByText('Fully vested at')
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}

// indexed to the middle of the schedule while the chain has run past its end
export const IndexBehind: StoryObj = {
    ...behind(
        {account: subject({...funds(numn(1_001_250.5), '0', numn(700_000)), vestingJson: [PARTIAL], locksJson: [lock('vesting', numn(700_000))]})},
        {height: 700_000, timestamp: at(700_000)},
        1_500_000,
        {tab: 'vesting'}
    ),
    play: async ({canvas}) => expect(canvas.getByText('30.00% vested')).toBeInTheDocument(),
}
