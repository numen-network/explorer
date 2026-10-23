import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {useState} from 'react'
import {expect, waitFor, within} from 'storybook/test'
import {Button} from '@/components/ui/button'
import {expectArrowsOnLabelLine} from '../../.storybook/fit'
import TabScroller from './TabScroller'

const meta = {title: 'Components/TabScroller'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const LABELS = ['Extrinsics', 'Transfers', 'Tokens', 'Identity', 'Judgements', 'Subs', 'Votes', 'Delegations', 'Proxies', 'Multisig', 'Locks', 'Vesting', 'Mining', 'Validator', 'Bounties', 'Treasury spends']
const TRANSFERS = LABELS.indexOf('Transfers')
const TOKENS = LABELS.indexOf('Tokens')
const MINING = LABELS.indexOf('Mining')
const BOUNTIES = LABELS.indexOf('Bounties')

function Strip({count, selected}: {count: number; selected?: number}) {
    return (
        <nav aria-label="Tabs" className="border-b">
            <TabScroller>
                {LABELS.slice(0, count).map((label, i) => (
                    <a key={label} href={`#${label}`} aria-current={i === selected ? 'page' : undefined} className="shrink-0 pb-3 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground">
                        {label}
                    </a>
                ))}
            </TabScroller>
        </nav>
    )
}

const scroller = (root: HTMLElement) => root.querySelector<HTMLElement>('.overflow-x-auto')!

// the selected tab lies inside the strip and clear of whichever arrows are up
function selectedInView(list: HTMLElement) {
    const tab = within(list).getByRole('link', {current: 'page'}).getBoundingClientRect()
    const strip = scroller(list).getBoundingClientRect()
    const arrows = within(list).queryAllByRole('button').map(b => b.getBoundingClientRect())
    return tab.left >= strip.left && tab.right <= strip.right && arrows.every(a => tab.right <= a.left || tab.left >= a.right)
}

export const Fits: Story = {render: () => <Strip count={3} />}

export const OverflowAtStart: Story = {
    render: () => <Strip count={LABELS.length} />,
    play: async ({canvas, canvasElement}) => {
        await canvas.findByRole('button', {name: 'Scroll right'})
        await expect(canvas.queryByRole('button', {name: 'Scroll left'})).toBeNull()
        expectArrowsOnLabelLine(canvasElement)
    },
}

export const OverflowScrolledRight: Story = {
    render: () => <Strip count={LABELS.length} />,
    play: async ({canvas, canvasElement, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'Scroll right'}))
        await waitFor(() => expect(scroller(canvasElement).scrollLeft).toBeGreaterThan(0))
        await canvas.findByRole('button', {name: 'Scroll left'})
        expectArrowsOnLabelLine(canvasElement)
    },
}

export const OverflowAtEnd: Story = {
    render: () => <Strip count={LABELS.length} />,
    play: async ({canvas, canvasElement}) => {
        const el = scroller(canvasElement)
        el.scrollLeft = el.scrollWidth
        await canvas.findByRole('button', {name: 'Scroll left'})
        await waitFor(() => expect(canvas.queryByRole('button', {name: 'Scroll right'})).toBeNull())
        expectArrowsOnLabelLine(canvasElement)
    },
}

// whether the strip took a wheel turn, rather than leaving it to the page
function wheel(strip: HTMLElement, deltaX: number, deltaY: number) {
    const event = new WheelEvent('wheel', {deltaX, deltaY, bubbles: true, cancelable: true})
    strip.dispatchEvent(event)
    return event.defaultPrevented
}

// a mouse wheel scrolls a strip as narrow as a phone's sideways and leaves the
// page alone until the strip runs out of room, a gesture that already runs
// sideways stays the browser's
export const WheelScrollsSideways: Story = {
    render: () => (
        <div className="max-w-80">
            <Strip count={LABELS.length} />
        </div>
    ),
    play: async ({canvasElement}) => {
        const strip = scroller(canvasElement)
        await expect(wheel(strip, 0, 120)).toBe(true)
        await expect(strip.scrollLeft).toBe(120)
        await expect(wheel(strip, 0, -120)).toBe(true)
        await expect(strip.scrollLeft).toBe(0)
        await expect(wheel(strip, 0, -120)).toBe(false)
        strip.scrollLeft = strip.scrollWidth
        await expect(wheel(strip, 0, 120)).toBe(false)
        strip.scrollLeft = 0
        await expect(wheel(strip, 120, 10)).toBe(false)
        await expect(strip.scrollLeft).toBe(0)
    },
}

// two strips as narrow as a phone's on one page, like account groups over
// their sub tabs
export const SelectedOffscreen: Story = {
    render: () => (
        <div className="flex max-w-80 flex-col gap-4">
            <Strip count={LABELS.length} selected={MINING} />
            <Strip count={LABELS.length} selected={BOUNTIES} />
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        for (const list of canvas.getAllByRole('navigation')) {
            await within(list).findByRole('button', {name: 'Scroll left'})
            expect(selectedInView(list)).toBe(true)
        }
        expectArrowsOnLabelLine(canvasElement)
    },
}

export const SelectedInView: Story = {
    render: () => (
        <div className="max-w-80">
            <Strip count={LABELS.length} selected={TRANSFERS} />
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        await canvas.findByRole('button', {name: 'Scroll right'})
        expect(selectedInView(canvas.getByRole('navigation'))).toBe(true)
        expect(scroller(canvasElement).scrollLeft).toBe(0)
        expectArrowsOnLabelLine(canvasElement)
    },
}

// the selected tab ends 28px short of the strip's edge, under the fade of the
// right arrow
export const SelectedUnderArrow: Story = {
    render: () => (
        <div className="w-63">
            <Strip count={6} selected={TOKENS} />
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        const list = canvas.getByRole('navigation')
        await within(list).findByRole('button', {name: 'Scroll left'})
        expect(selectedInView(list)).toBe(true)
        expectArrowsOnLabelLine(canvasElement)
    },
}

// the strip stays mounted while the selection moves, as it does on back and forward
function Moving() {
    const [selected, setSelected] = useState(0)
    return (
        <div className="flex max-w-80 flex-col gap-4">
            <Strip count={LABELS.length} selected={selected} />
            <div className="flex gap-2">
                {[0, MINING].map(i => (
                    <Button key={i} variant="outline" size="sm" onClick={() => setSelected(i)}>
                        Select {LABELS[i]}
                    </Button>
                ))}
            </div>
        </div>
    )
}

export const SelectionMoves: Story = {
    render: () => <Moving />,
    play: async ({canvas, canvasElement, userEvent}) => {
        const list = canvas.getByRole('navigation')
        await userEvent.click(canvas.getByRole('button', {name: 'Select Mining'}))
        await within(list).findByRole('button', {name: 'Scroll left'})
        expect(selectedInView(list)).toBe(true)
        expectArrowsOnLabelLine(canvasElement)
        await userEvent.click(canvas.getByRole('button', {name: 'Select Extrinsics'}))
        await waitFor(() => expect(scroller(canvasElement).scrollLeft).toBe(0))
    },
}
