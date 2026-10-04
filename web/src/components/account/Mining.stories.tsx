import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {minedDays} from '../../../../mock/fixtures/accounts.js'
import {axesLegible, PHONE, tooltipsInView} from '../../../.storybook/fit'
import Mining from './Mining'

const meta = {title: 'Components/Account/Mining'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const OneDay: Story = {render: () => <Mining days={minedDays(1)} />, play: axesLegible}

export const ThirtyDays: Story = {render: () => <Mining days={minedDays(30)} />, play: axesLegible}

export const SixtyDays: Story = {render: () => <Mining days={minedDays(60)} />, play: axesLegible}

export const ThirtyDaysTooltipOnPhone: Story = {...ThirtyDays, globals: PHONE, play: tooltipsInView}
