import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {fmtInt} from '@/lib/format'
import {expectPagersFit} from '../../.storybook/fit'
import Pager from './Pager'

const at = (page: number, size = 20) => ({page, size, offset: (page - 1) * size})

// a page number of any length keeps 6px of padding inside its 1px border
async function paddingKept(root: HTMLElement) {
    for (const link of within(root).queryAllByRole('link', {name: /page \d+$/})) {
        const box = link.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(link)
        const digits = range.getBoundingClientRect()
        await expect(Math.round(Math.min(digits.left - box.left, box.right - digits.right))).toBeGreaterThanOrEqual(7)
    }
}

const meta = {
    title: 'Components/Pager',
    component: Pager,
    args: {paging: at(1), total: 1_000, href: '/blocks'},
    // the list it pages sits right above it, the way every list page lays them out
    decorators: [
        (Story, {args}) => (
            <>
                <Card size="flush" className="px-5 py-4 text-sm text-muted-foreground">
                    {fmtInt(args.total)} rows
                </Card>
                <Story />
            </>
        ),
    ],
    play: async ({canvasElement}) => paddingKept(canvasElement),
} satisfies Meta<typeof Pager>
export default meta
type Story = StoryObj<typeof meta>

// the first, middle and last page of a page count
const lengths = (pages: number): Story => ({
    args: {total: pages * 20},
    render: args => (
        <>
            {[1, Math.ceil(pages / 2), pages].map(page => (
                <Pager key={page} {...args} paging={at(page)} />
            ))}
        </>
    ),
    play: async ({canvasElement}) => {
        await paddingKept(canvasElement)
        expectPagersFit(canvasElement)
    },
})

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

export const ThreeAndFourDigits: Story = {args: {paging: at(999), total: 21_000}}

export const FourDigitPages: Story = {args: {paging: at(4_200), total: 168_000}}

export const HugeTotal: Story = {args: {paging: at(41_666), total: 1_000_000}}

export const HugeTotalLastPage: Story = {args: {paging: at(50_000), total: 1_000_000}}

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

export const GoToPageTyped: Story = {
    args: {paging: at(41_666), total: 1_000_000},
    play: async ({canvas, userEvent}) => {
        const input = canvas.getByRole('textbox', {name: 'Go to page'})
        await userEvent.type(input, '50000')
        await expect(input.scrollWidth).toBeLessThanOrEqual(input.clientWidth)
    },
}

export const OneDigit: Story = lengths(9)

export const TwoDigits: Story = lengths(99)

export const ThreeDigits: Story = lengths(999)

export const FourDigits: Story = lengths(9_999)

export const FiveDigits: Story = lengths(99_999)

export const SixDigits: Story = lengths(999_999)

export const SevenDigits: Story = lengths(9_999_999)
