import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor} from 'storybook/test'
import {minedDays} from '../../../../mock/fixtures/accounts.js'
import {axesLegible, categoriesIn, tooltipsInView} from '../../../.storybook/fit'
import {MinedDaysChart} from './Mining'

const meta = {title: 'Pages/Account/Mining'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const SIXTY_DAYS = minedDays(60)

export const ChartOneDay: Story = {render: () => <MinedDaysChart days={minedDays(1)} />, play: axesLegible}

export const ChartThirtyDays: Story = {render: () => <MinedDaysChart days={minedDays(30)} />, play: axesLegible}

// sixty days in, the newest thirty drawn oldest first
export const ChartCapsAtThirtyDays: Story = {
    render: () => <MinedDaysChart days={SIXTY_DAYS} />,
    play: async ({canvasElement}) =>
        waitFor(() =>
            expect(categoriesIn(canvasElement)).toEqual([
                SIXTY_DAYS.slice(0, 30)
                    .reverse()
                    .map(d => d.day.slice(5)),
            ])
        ),
}

export const ChartThirtyDaysTooltip: Story = {...ChartThirtyDays, play: tooltipsInView}
