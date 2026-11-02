import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {block, chainInfo, HEAD} from '../../../../../mock/fixtures.js'
import type {RawStep} from '@/components/timeline'
import {fmtInt} from '@/lib/format'
import {blocksConstant} from '@/lib/runtime'
import {progressIn} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {card, curated, deciding, story} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Status', ...pageMeta(ReferendumPage)}

// a quarter into its decision period at the newest indexed block while the
// chain has run past the whole period, the bars read prepare, decision,
// confirmation and enactment
export const DecidingIndexBehind: StoryObj = {
    ...story({...curated(5), decidingSince: HEAD - 60_480}, 'call', {chainInfos: [{...chainInfo, head: HEAD + 300_000, finalizedHead: HEAD + 299_998}]}),
    play: async ({canvasElement}) => expect(progressIn(canvasElement)).toEqual([100, 25, 0, 0]),
}

// prepare and confirm periods that stop between two whole units of time
export const UnevenPeriods: StoryObj = {
    ...story({...deciding(28, 'Prepare and confirm periods that stop between whole units of time'), trackParams: {...(curated(5).trackParams as object), preparePeriod: 540, confirmPeriod: 36_000}}, 'call'),
    play: async ({canvasElement}) => {
        for (const span of ['1h 30m', '28d', '4d 4h', '1d']) await expect(card(canvasElement, 'Status').getByText(span)).toBeInTheDocument()
    },
}

// no decision deposit yet, so it times out UndecidingTimeout after submission
export const WaitingForDecisionDeposit: StoryObj = {
    ...story(curated(8), 'call'),
    play: async ({canvasElement}) => {
        const timeoutAt = (curated(8).submittedAt as number) + blocksConstant(block(HEAD).specVersion, 'Referenda.UndecidingTimeout')
        const row = card(canvasElement, 'Status').getByText('Timeout').parentElement!
        await expect(row.lastElementChild).toHaveTextContent(/^in \S/)
        await expect(row.querySelector('a')).toHaveTextContent(`#${fmtInt(timeoutAt)}`)
    },
}

// the decision deposit is in, so nothing times out
export const Preparing: StoryObj = {
    ...story(curated(9), 'call'),
    play: async ({canvasElement}) => expect(card(canvasElement, 'Status').queryByText('Timeout')).toBeNull(),
}

const phaseTimes = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=phase-time]')].map(e => e.textContent)

// prepare ran out, the decision runs to its period end, confirmation and
// enactment are expected where the current tally first passes
export const PhaseTimesDeciding: StoryObj = {
    ...story(curated(5), 'call'),
    play: async ({canvasElement}) =>
        expect(phaseTimes(canvasElement)).toEqual(['Ended · #951,440', '22d 9h remaining · #1,193,360', 'Est. start in 17d · #1,147,035', 'Est. start in 24d · #1,207,515']),
}

// an approval below the curve's floor never passes in the decision period
export const PhaseTimesExpectedToFail: StoryObj = {
    ...story({...curated(5), ayes: '1000000000000000000000000'}, 'call'),
    play: async ({canvasElement}) =>
        expect(phaseTimes(canvasElement)).toEqual(['Ended · #951,440', '22d 9h remaining · #1,193,360', 'Expected to fail', 'Expected to fail']),
}

// a confirmation still open past the decision period keeps the decision going
// to its end, the period end stays on the bar as a mark
const pastDecision = {...curated(6), trackParams: {...(curated(6).trackParams as object), decisionPeriod: 30_000}}
export const PhaseTimesConfirmingPastDecision: StoryObj = {
    ...story(pastDecision, 'call'),
    play: async ({canvasElement}) => {
        await expect(phaseTimes(canvasElement)).toEqual(['Ended · #961,440', '1d 20h remaining · #1,015,920', '1d 20h remaining · #1,015,920', 'Est. start in 1d 20h · #1,015,920'])
        await expect(progressIn(canvasElement)[1]).toBeCloseTo(((HEAD - 961_440) / 54_480) * 100)
        await expect(parseFloat(card(canvasElement, 'Status').getByText('3d 11h').style.left)).toBeCloseTo((30_000 / 54_480) * 100)
    },
}

// approved and waiting out the enactment period
const enacting = {
    ...curated(0),
    submittedAt: 898_000,
    decidingSince: 900_000,
    confirmingSince: 988_360,
    endedAt: 997_000,
    enactsAt: 1_005_640,
    timeline: (curated(0).timeline as RawStep[]).filter(s => !s.name.startsWith('Scheduler.')),
}
export const PhaseTimesEnacting: StoryObj = {
    ...story(enacting, 'call'),
    play: async ({canvasElement}) => expect(phaseTimes(canvasElement)).toEqual(['Ended · #899,440', 'Ended · #997,000', 'Ended · #997,000', '15h 40m remaining · #1,005,640']),
}

// the submitter asked for a later enactment than the track's minimum
export const PhaseTimesEnactingRequestedLater: StoryObj = {
    ...story({...enacting, enactment: {__kind: 'After', value: 20_000}, enactsAt: 1_017_000}, 'call'),
    play: async ({canvasElement}) => {
        await expect(phaseTimes(canvasElement)[3]).toBe('1d 23h remaining · #1,017,000')
        await expect(progressIn(canvasElement)[3]).toBeCloseTo(((HEAD - 997_000) / 20_000) * 100)
    },
}

// a requested block sooner than the track's minimum waits out the minimum
export const PhaseTimesEnactingAtTooSoon: StoryObj = {
    ...story({...enacting, enactment: {__kind: 'At', value: 1_000_500}, enactsAt: 1_005_640}, 'call'),
    play: async ({canvasElement}) => expect(phaseTimes(canvasElement)[3]).toBe('15h 40m remaining · #1,005,640'),
}

// every phase closed, the enactment at its dispatch
export const PhaseTimesExecuted: StoryObj = {
    ...story(curated(0), 'call'),
    play: async ({canvasElement}) => expect(phaseTimes(canvasElement)).toEqual(['Ended · #521,440', 'Ended · #588,640', 'Ended · #588,640', 'Ended · #597,280']),
}
