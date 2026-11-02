import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {expectArrowsWalkToEnd} from '../../.storybook/fit'
import ScrollStrip from './ScrollStrip'

const meta = {title: 'Components/ScrollStrip'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

function Strip({count}: {count: number}) {
    return (
        <div className="max-w-80">
            <ScrollStrip look="disc" stripClassName="gap-4">
                {Array.from({length: count}, (_, i) => (
                    <div key={i} className="grid h-40 w-24 shrink-0 place-items-center rounded-lg border bg-card">
                        Item {i + 1}
                    </div>
                ))}
            </ScrollStrip>
        </div>
    )
}

const scroller = (root: HTMLElement) => root.querySelector<HTMLElement>('.overflow-x-auto')!

export const Fits: Story = {
    render: () => <Strip count={2} />,
    play: async ({canvas}) => expect(canvas.queryAllByRole('button')).toHaveLength(0),
}

export const WalksToEnd: Story = {
    render: () => <Strip count={6} />,
    play: async ({canvasElement}) => expectArrowsWalkToEnd(canvasElement, scroller(canvasElement), 3),
}
