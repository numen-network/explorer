import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {fmtInt} from '@/lib/format'
import {all, expectPagersFit} from '../../.storybook/fit'
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
} satisfies Meta<typeof Pager>
export default meta
type Story = StoryObj<typeof meta>
type Play = NonNullable<Story['play']>

const pagerIn = (root: HTMLElement) => within(within(root).getByRole('navigation'))

const padded: Play = async ({canvasElement}) => paddingKept(canvasElement)

// the page marked current, previous off only on the first page and next only on the last
const opens =
    (page: number, last: number): Play =>
    async ({canvasElement}) => {
        const nav = pagerIn(canvasElement)
        await expect(nav.getByRole('link', {current: 'page'})).toHaveTextContent(new RegExp(`^${page}$`))
        await expect(nav.getByRole('link', {name: 'previous page'})).toHaveAttribute('aria-disabled', String(page === 1))
        await expect(nav.getByRole('link', {name: 'next page'})).toHaveAttribute('aria-disabled', String(page === last))
    }

// the size picked, and the last page it leaves the thousand rows
const pagedBy =
    (size: number): Play =>
    async ({canvasElement}) => {
        const nav = pagerIn(canvasElement)
        await expect(nav.getByRole('combobox', {name: 'Rows per page'})).toHaveTextContent(`${size} / page`)
        await expect(nav.getByRole('link', {name: `last page, page ${1_000 / size}`})).toBeVisible()
    }

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

export const FirstPage: Story = {play: opens(1, 50)}

export const SecondPage: Story = {args: {paging: at(2)}, play: opens(2, 50)}

export const MiddlePage: Story = {args: {paging: at(25)}, play: opens(25, 50)}

export const LastPage: Story = {args: {paging: at(50)}, play: opens(50, 50)}

// a list of one page still shows the whole pager, page 1 current and both arrows off
async function onePage({canvasElement}: {canvasElement: HTMLElement}) {
    const nav = within(canvasElement).getByRole('navigation')
    const pages = within(nav).getAllByRole('link', {name: /page \d+$/})
    await expect(pages.map(p => p.textContent)).toEqual(['1'])
    await expect(pages[0]).toHaveAttribute('aria-current', 'page')
    for (const name of [/previous/i, /next/i]) await expect(within(nav).getByRole('link', {name})).toHaveAttribute('aria-disabled', 'true')
    await expect(within(nav).getByRole('combobox', {name: 'Rows per page'})).toBeVisible()
    await expect(within(nav).getByLabelText('Go to page')).toBeVisible()
}

export const SinglePage: Story = {args: {total: 15}, play: onePage}

// ten rows fill one page of the smallest size exactly
export const FitsSmallestPage: Story = {
    args: {paging: at(1, 10), total: 10},
    play: all(onePage, async ({canvasElement}) => expect(pagerIn(canvasElement).getByRole('combobox', {name: 'Rows per page'})).toHaveTextContent('10 / page')),
}

export const Empty: Story = {args: {total: 0}, play: onePage}

export const TwoPages: Story = {
    args: {paging: at(2, 10), total: 11},
    play: async ({canvasElement}) => expect(pagerIn(canvasElement).getAllByRole('link', {name: /page \d+$/}).map(link => link.textContent)).toEqual(['1', '2']),
}

export const PageSize10: Story = {args: {paging: at(3, 10)}, play: pagedBy(10)}

export const PageSize50: Story = {args: {paging: at(3, 50)}, play: pagedBy(50)}

export const PageSize100: Story = {args: {paging: at(3, 100)}, play: pagedBy(100)}

export const ThreeAndFourDigits: Story = {args: {paging: at(999), total: 21_000}, play: padded}

export const HugeTotal: Story = {args: {paging: at(41_666), total: 1_000_000}, play: padded}

export const HugeTotalLastPage: Story = {args: {paging: at(50_000), total: 1_000_000}, play: all(opens(50_000, 50_000), padded)}

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

// the window follows the box the pager sits in, so a narrow box keeps only the
// current page between the jumps even on a wide screen
export const ThreeSlotsInNarrowBox: Story = {
    args: {paging: at(25_000), total: 1_000_000},
    decorators: [
        Story => (
            <div className="max-w-sm">
                <Story />
            </div>
        ),
    ],
    play: async ({canvasElement}) => {
        const nav = pagerIn(canvasElement)
        await expect(nav.getAllByRole('link', {name: /page \d+$/}).map(link => link.textContent)).toEqual(['25000'])
        await expect(nav.getAllByRole('link', {name: /5 pages$/})).toHaveLength(2)
        expectPagersFit(canvasElement)
    },
}
