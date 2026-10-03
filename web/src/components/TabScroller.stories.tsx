import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor} from 'storybook/test'
import TabScroller from './TabScroller'

const meta = {title: 'Components/TabScroller'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const LABELS = ['Extrinsics', 'Transfers', 'Tokens', 'Identity', 'Judgements', 'Subs', 'Votes', 'Delegations', 'Proxies', 'Multisig', 'Locks', 'Vesting', 'Mining', 'Validator', 'Bounties', 'Treasury spends']

function Strip({count}: {count: number}) {
    return (
        <div className="border-b">
            <TabScroller>
                {LABELS.slice(0, count).map(label => (
                    <a key={label} href={`#${label}`} className="shrink-0 pb-3 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground">
                        {label}
                    </a>
                ))}
            </TabScroller>
        </div>
    )
}

const scroller = (root: HTMLElement) => root.querySelector<HTMLElement>('.overflow-x-auto')!

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
