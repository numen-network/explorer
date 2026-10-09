import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, screen} from 'storybook/test'
import {Card} from '@/components/ui/card'
import DateRange from './DateRange'

const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10)

const meta = {
    title: 'Components/DateRange',
    component: DateRange,
    args: {after: '', before: '', lastDay: day(0)},
    // the chart and extrinsics pages set it in a small form row on a card
    decorators: [
        Story => (
            <Card size="flush" className="w-fit max-w-full px-5 py-4">
                <form className="flex flex-wrap items-center gap-2 text-xs">
                    <Story />
                </form>
            </Card>
        ),
    ],
} satisfies Meta<typeof DateRange>
export default meta
type Story = StoryObj<typeof meta>

export const AnyDate: Story = {}

export const FullRange: Story = {
    args: {after: day(45), before: day(15)},
    play: async ({canvas}) => {
        await expect(canvas.getByRole('button')).toHaveAttribute('data-active', 'false')
    },
}

export const FromOnly: Story = {args: {after: day(20)}}

export const ToOnly: Story = {args: {before: day(60)}}

// the chart page picks a custom range over its presets
export const Active: Story = {
    args: {after: day(45), before: day(15), active: true},
    play: async ({canvas}) => {
        await expect(canvas.getByRole('button')).toHaveAttribute('data-active', 'true')
    },
}

export const CalendarOpen: Story = {
    args: {after: day(12), before: day(4)},
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button'))
        await expect(await screen.findByRole('grid')).toBeInTheDocument()
    },
}

export const ActiveCalendarOpen: Story = {...CalendarOpen, args: {...CalendarOpen.args, active: true}}

export const CalendarOpenEmpty: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button'))
        await expect(await screen.findByRole('grid')).toBeInTheDocument()
    },
}

// only genesis is indexed, which carries no timestamp, so there is no day to pick
export const NothingIndexed: Story = {
    args: {lastDay: null},
    play: async ({canvas}) => {
        await expect(canvas.queryByRole('button')).toBeNull()
    },
}
