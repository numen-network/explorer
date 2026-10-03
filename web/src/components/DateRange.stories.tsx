import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, screen} from 'storybook/test'
import DateRange from './DateRange'

const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10)

const meta = {
    title: 'Components/DateRange',
    component: DateRange,
    args: {after: '', before: ''},
    // the chart page sets it in a small form row
    decorators: [
        Story => (
            <form className="flex flex-wrap items-center gap-2 text-xs">
                <Story />
            </form>
        ),
    ],
} satisfies Meta<typeof DateRange>
export default meta
type Story = StoryObj<typeof meta>

export const AnyDate: Story = {}

export const FullRange: Story = {args: {after: day(45), before: day(15)}}

export const FromOnly: Story = {args: {after: day(20)}}

export const ToOnly: Story = {args: {before: day(60)}}

export const CalendarOpen: Story = {
    args: {after: day(12), before: day(4)},
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button'))
        await expect(await screen.findByRole('grid')).toBeInTheDocument()
    },
}

export const CalendarOpenEmpty: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button'))
        await expect(await screen.findByRole('grid')).toBeInTheDocument()
    },
}
