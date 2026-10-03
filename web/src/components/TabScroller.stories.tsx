import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {useState} from 'react'
import {expect, waitFor, within} from 'storybook/test'
import {Button} from '@/components/ui/button'
import {PHONE} from '../../.storybook/fit'
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
        <div role="tablist" className="border-b">
            <TabScroller>
                {LABELS.slice(0, count).map((label, i) => (
                    <a key={label} href={`#${label}`} role="tab" aria-selected={i === selected} className="shrink-0 pb-3 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground aria-selected:font-semibold aria-selected:text-foreground">
                        {label}
                    </a>
                ))}
            </TabScroller>
        </div>
    )
}

const scroller = (root: HTMLElement) => root.querySelector<HTMLElement>('.overflow-x-auto')!

// the selected tab lies inside the strip and clear of whichever arrows are up
function selectedInView(list: HTMLElement) {
    const tab = within(list).getByRole('tab', {selected: true}).getBoundingClientRect()
    const strip = scroller(list).getBoundingClientRect()
    const arrows = within(list).queryAllByRole('button').map(b => b.getBoundingClientRect())
    return tab.left >= strip.left && tab.right <= strip.right && arrows.every(a => tab.right <= a.left || tab.left >= a.right)
}

export const Fits: Story = {render: () => <Strip count={3} />}

export const OverflowAtStart: Story = {render: () => <Strip count={LABELS.length} />}

export const OverflowScrolledRight: Story = {
    render: () => <Strip count={LABELS.length} />,
    play: async ({canvas, canvasElement, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'Scroll right'}))
        await waitFor(() => expect(scroller(canvasElement).scrollLeft).toBeGreaterThan(0))
        await canvas.findByRole('button', {name: 'Scroll left'})
    },
}

export const OverflowAtEnd: Story = {
    render: () => <Strip count={LABELS.length} />,
    play: async ({canvas, canvasElement}) => {
        const el = scroller(canvasElement)
        el.scrollLeft = el.scrollWidth
        await canvas.findByRole('button', {name: 'Scroll left'})
        await waitFor(() => expect(canvas.queryByRole('button', {name: 'Scroll right'})).toBeNull())
    },
}

// two strips on one page, like account groups over their sub tabs
export const SelectedOffscreenOnPhone: Story = {
    globals: PHONE,
    render: () => (
        <div className="flex flex-col gap-4">
            <Strip count={LABELS.length} selected={MINING} />
            <Strip count={LABELS.length} selected={BOUNTIES} />
        </div>
    ),
    play: async ({canvas}) => {
        for (const list of canvas.getAllByRole('tablist')) {
            await within(list).findByRole('button', {name: 'Scroll left'})
            expect(selectedInView(list)).toBe(true)
        }
    },
}

export const SelectedInViewOnPhone: Story = {
    globals: PHONE,
    render: () => <Strip count={LABELS.length} selected={TRANSFERS} />,
    play: async ({canvas, canvasElement}) => {
        await canvas.findByRole('button', {name: 'Scroll right'})
        expect(selectedInView(canvas.getByRole('tablist'))).toBe(true)
        expect(scroller(canvasElement).scrollLeft).toBe(0)
    },
}

// tabs as wide as the selected label put its end 28px short of the strip's
// edge, under the fade of the right arrow
export const SelectedUnderArrow: Story = {
    render: () => (
        <div className="w-58 [&_[role=tab]]:w-13">
            <Strip count={6} selected={TOKENS} />
        </div>
    ),
    play: async ({canvas}) => {
        const list = canvas.getByRole('tablist')
        await within(list).findByRole('button', {name: 'Scroll left'})
        expect(selectedInView(list)).toBe(true)
    },
}

// the strip stays mounted while the selection moves, as it does on back and forward
function Moving() {
    const [selected, setSelected] = useState(0)
    return (
        <div className="flex flex-col gap-4">
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

export const SelectionMovesOnPhone: Story = {
    globals: PHONE,
    render: () => <Moving />,
    play: async ({canvas, canvasElement, userEvent}) => {
        const list = canvas.getByRole('tablist')
        await userEvent.click(canvas.getByRole('button', {name: 'Select Mining'}))
        await within(list).findByRole('button', {name: 'Scroll left'})
        expect(selectedInView(list)).toBe(true)
        await userEvent.click(canvas.getByRole('button', {name: 'Select Extrinsics'}))
        await waitFor(() => expect(scroller(canvasElement).scrollLeft).toBe(0))
    },
}
