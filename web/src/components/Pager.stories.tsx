import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {fmtInt} from '@/lib/format'
import Pager from './Pager'

const at = (page: number, size = 20) => ({page, size, offset: (page - 1) * size})

const meta = {
    title: 'Components/Pager',
    component: Pager,
    args: {paging: at(1), total: 1_000, href: '/blocks'},
    // the list it pages sits right above it, the way every list page lays them out
    decorators: [
        (Story, {args}) => (
            <div>
                <Card size="flush" className="px-5 py-4 text-sm text-muted-foreground">
                    {fmtInt(args.total)} rows
                </Card>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Pager>
export default meta
type Story = StoryObj<typeof meta>

export const FirstPage: Story = {}

export const SecondPage: Story = {args: {paging: at(2)}}

export const MiddlePage: Story = {args: {paging: at(25)}}

export const LastPage: Story = {args: {paging: at(50)}}

export const SinglePage: Story = {args: {total: 15}}

export const FitsSmallestPage: Story = {args: {total: 10}}

export const TwoPages: Story = {args: {paging: at(2, 10), total: 11}}

export const PageSize10: Story = {args: {paging: at(3, 10)}}

export const PageSize50: Story = {args: {paging: at(3, 50)}}

export const PageSize100: Story = {args: {paging: at(3, 100)}}

export const HugeTotal: Story = {args: {paging: at(41_666), total: 1_000_000}}

export const PageSizeMenuOpen: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('combobox', {name: 'Rows per page'}))
        await waitFor(() => expect(document.querySelectorAll('[role="option"]')).toHaveLength(4))
    },
}

export const JumpHovered: Story = {
    args: {paging: at(25)},
    play: async ({canvas, userEvent}) => {
        await userEvent.hover(canvas.getByRole('link', {name: 'Next 5 pages'}))
    },
}
