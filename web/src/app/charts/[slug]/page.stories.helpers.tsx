import type {StoryObj} from '@storybook/nextjs-vite'
import {waitFor} from 'storybook/test'
import {chartBySlug} from '@/lib/charts'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {axesLegible, expectLegibleAxes, lonePointsPainted} from '../../../../.storybook/fit'
import {pageStory} from '../../../../.storybook/page'

export type Day = (typeof DAILY)[number]
export type Play = NonNullable<StoryObj['play']>

// a line through a single day has no segment to draw, so the day shows as a dot
const oneDayLine: StoryObj['play'] = async context => {
    await waitFor(() => expectLegibleAxes(context.canvasElement))
    await lonePointsPainted(context)
}

export const chart = (slug: string, days: Day[], searchParams = {}): StoryObj => ({
    ...pageStory({dailyStats: days}, {params: {slug}, searchParams}),
    play: days.length ? (days.length === 1 && chartBySlug(slug)!.kind === 'line' ? oneDayLine : axesLegible) : undefined,
})

export const NONE: Day[] = []
export const FIRST = DAILY.slice(0, 1)

export const checked = (story: StoryObj, check: Play): StoryObj => ({
    ...story,
    play: async context => {
        await story.play?.(context)
        await check(context)
    },
})
