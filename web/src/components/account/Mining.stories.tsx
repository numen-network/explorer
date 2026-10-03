import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {minedDays} from '../../../../mock/fixtures/accounts.js'
import Mining from './Mining'

const meta = {title: 'Components/Account/Mining'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const OneDay: Story = {render: () => <Mining days={minedDays(1)} />}

export const ThirtyDays: Story = {render: () => <Mining days={minedDays(30)} />}

export const SixtyDays: Story = {render: () => <Mining days={minedDays(60)} />}
