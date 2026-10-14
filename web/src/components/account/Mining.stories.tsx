import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {minedDays} from '../../../../mock/fixtures/accounts.js'
import {axesLegible, tooltipsInView} from '../../../.storybook/fit'
import {MinedDaysChart} from './Mining'

const meta = {title: 'Components/Account/Mining'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const OneDay: Story = {render: () => <MinedDaysChart days={minedDays(1)} />, play: axesLegible}

export const ThirtyDays: Story = {render: () => <MinedDaysChart days={minedDays(30)} />, play: axesLegible}

export const SixtyDays: Story = {render: () => <MinedDaysChart days={minedDays(60)} />, play: axesLegible}

export const ThirtyDaysTooltip: Story = {...ThirtyDays, play: tooltipsInView}
