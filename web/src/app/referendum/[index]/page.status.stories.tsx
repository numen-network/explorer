import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {chainInfo, HEAD} from '../../../../../mock/fixtures.js'
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
    ...story({...deciding(28, 'Prepare and confirm periods that stop between whole units of time'), track: {...(curated(5).track as object), preparePeriod: 540, confirmPeriod: 36_000}}, 'call'),
    play: async ({canvasElement}) => {
        for (const span of ['1h 30m', '28d', '4d 4h', '1d']) await expect(card(canvasElement, 'Status').getByText(span)).toBeInTheDocument()
    },
}
