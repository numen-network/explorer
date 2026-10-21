import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import ChartList from './ChartList'

const meta = {
    title: 'Pages/Charts/Chart list',
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

// only the chart being read is the current page of the list, a navigation
// landmark named apart from the range pills beside the chart
const current =
    (href: string): Story['play'] =>
    async ({canvas}) =>
        expect(within(canvas.getByRole('navigation', {name: 'Charts'})).getAllByRole('link', {current: 'page'}).map(link => link.getAttribute('href'))).toEqual([href])

export const FirstActive: Story = {play: current('/charts/blocks')}

export const LastActive: Story = {args: {active: 'treasury'}, play: current('/charts/treasury')}

export const FilteredByTitle: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.type(canvas.getByPlaceholderText('Search by chart name'), 'issu')
        await expect(canvas.getAllByRole('link')).toHaveLength(3)
        await expect(canvas.queryByRole('link', {current: 'page'})).toBeNull()
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
