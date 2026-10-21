import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {Day, chart, NONE, FIRST, checked} from './page.stories.helpers'

export default {title: 'Pages/Charts/Average Block Time', ...pageMeta(ChartPage)}

export const Empty = chart('block-time', NONE)
export const OneDay = chart('block-time', FIRST)
export const ManyDays = chart('block-time', DAILY)

// a day of a thousand and one blocks, each the given milliseconds after the last
const paced = (d: Day, ms: number) => ({...d, blocks: 1_001, tsLast: new Date(Date.parse(d.tsFirst) + ms * 1_000).toISOString()})

// the newest day's blocks came 9.9961s apart and the day before's exactly 10s
export const TruncationEdge: StoryObj = {
    ...chart('block-time', [...DAILY.slice(0, -2), paced(DAILY.at(-2)!, 10_000), paced(DAILY.at(-1)!, 9_996.1)]),
    play: async ({canvas}) => {
        await expect(canvas.getByText('The latest value of Average Block Time is 9.99. Compared with the day before it is down by 0.03%.')).toBeInTheDocument()
    },
}

// the newest day's blocks came 10.1s apart and the day before's exactly 10s
export const ChangeEdge = checked(chart('block-time', [...DAILY.slice(0, -2), paced(DAILY.at(-2)!, 10_000), paced(DAILY.at(-1)!, 10_100)]), async ({canvas}) => {
    await expect(canvas.getByText('The latest value of Average Block Time is 10.10. Compared with the day before it is up by 1.00%.')).toBeInTheDocument()
})
