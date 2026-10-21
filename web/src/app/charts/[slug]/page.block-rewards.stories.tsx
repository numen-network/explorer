import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {numn} from '../../../../../mock/fixtures.js'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Block Rewards', ...pageMeta(ChartPage)}

export const Empty = chart('block-rewards', NONE)
export const OneDay = chart('block-rewards', FIRST)
export const ManyDays = chart('block-rewards', DAILY)

// the newest two days end exactly on the last digit a reading shows
export const TruncationEdge: StoryObj = {
    ...chart('block-rewards', DAILY.map((d, i) => (i === DAILY.length - 2 ? {...d, rewards: numn(4.35)} : i === DAILY.length - 1 ? {...d, rewards: numn(1.15)} : d))),
    play: async ({canvas}) => {
        await expect(canvas.getByText(/^The latest value of Block Rewards is 1\.15 NUMN\./)).toBeInTheDocument()
    },
}
