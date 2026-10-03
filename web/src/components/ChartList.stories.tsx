import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import ChartList from './ChartList'

const meta = {
    title: 'Components/ChartList',
    component: ChartList,
    args: {active: 'blocks'},
    // the chart page gives the list a 220px column
    decorators: [
        Story => (
            <div className="w-[220px]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ChartList>
export default meta
type Story = StoryObj<typeof meta>

export const FirstActive: Story = {}

export const LastActive: Story = {args: {active: 'treasury'}}

export const FilteredByTitle: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.type(canvas.getByPlaceholderText('Search by chart name'), 'issu')
        await expect(canvas.getAllByRole('link')).toHaveLength(3)
    },
}

export const FilteredByGroup: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.type(canvas.getByPlaceholderText('Search by chart name'), 'governance')
        await expect(canvas.getAllByRole('link')).toHaveLength(1)
    },
}

export const NoMatch: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.type(canvas.getByPlaceholderText('Search by chart name'), 'hashrate')
        await expect(canvas.getByText('No chart by that name.')).toBeInTheDocument()
    },
}
