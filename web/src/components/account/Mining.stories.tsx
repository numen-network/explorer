import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {minedDays} from '../../../../mock/fixtures/accounts.js'
import {axesLegible, tooltipsInView} from '../../../.storybook/fit'
import {MinedDaysChart} from './Mining'

const meta = {title: 'Pages/Account/Mining'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const ChartOneDay: Story = {render: () => <MinedDaysChart days={minedDays(1)} />, play: axesLegible}

export const ChartThirtyDays: Story = {render: () => <MinedDaysChart days={minedDays(30)} />, play: axesLegible}

export const ChartSixtyDays: Story = {render: () => <MinedDaysChart days={minedDays(60)} />, play: axesLegible}

export const ChartThirtyDaysTooltip: Story = {...ChartThirtyDays, play: tooltipsInView}
