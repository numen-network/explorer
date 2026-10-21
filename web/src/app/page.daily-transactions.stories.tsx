import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor} from 'storybook/test'
import {DAILY, chainDays} from '../../../mock/fixtures/home.js'
import {numn} from '../../../mock/fixtures.js'
import {axesLegible, expectLegibleAxes, lastTooltipLines, lonePointsPainted, tooltipsInView} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {home, minedUpTo, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Daily transactions', ...pageMeta(Home)}

// how much of the day has passed follows the clock, so the two plotted counts are pinned apart
const freshDay = {...chainDays(1_234).at(-1)!, transfers: 12, transferVolume: numn(1_050)}

export const OneDay: StoryObj = {...pageStory(home({head: 1_234, days: [freshDay], objects: minedUpTo(1_234, 5)})), play: lonePointsPainted}

export const ManyDays: StoryObj = {...pageStory(home(many)), play: axesLegible}

export const TooltipInView: StoryObj = {...pageStory(home(many)), play: tooltipsInView}

// the day's volume a hair under ten billion coins, which a float takes for ten billion
const volumeDays = [...DAILY.slice(0, -1), {...DAILY.at(-1)!, transferVolume: '9999999999999999999999999999'}]

export const VolumePastFloat: StoryObj = {
    ...pageStory(home({...many, days: volumeDays})),
    play: async ({canvasElement}) => {
        await waitFor(() => expectLegibleAxes(canvasElement))
        expect(lastTooltipLines(canvasElement)[0].join('')).toContain('Volume (NUMN)≈9.99B')
    },
}
