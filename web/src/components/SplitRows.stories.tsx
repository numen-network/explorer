import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {expectFits} from '../../.storybook/fit'
import {SplitRow, SplitRows} from './SplitRows'

const meta = {title: 'Components/SplitRows'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const row = (n: number, value = `Value ${n}`) => (
    <SplitRow
        key={n}
        lead={
            <>
                <span>Lead {n}</span>
                <span className="text-muted-foreground">detail</span>
            </>
        }
    >
        <span className="font-mono">{value}</span>
    </SplitRow>
)

export const One: Story = {render: () => <SplitRows>{row(1)}</SplitRows>}

export const Many: Story = {render: () => <SplitRows>{Array.from({length: 8}, (_, i) => row(i + 1))}</SplitRows>}

// a value longer than the card keeps its line, and the card scrolls it sideways instead of spilling over the page
export const WiderThanCard: Story = {
    render: () => (
        <div className="max-w-sm">
            <SplitRows>{[row(1, ((1n << 256n) - 1n).toString()), row(2)]}</SplitRows>
        </div>
    ),
    play: async ({canvasElement}) => {
        const strip = canvasElement.querySelector<HTMLElement>('.overflow-x-auto')!
        await expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth)
        expectFits(canvasElement.querySelector('[data-slot=card]')!)
    },
}
