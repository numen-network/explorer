import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {expectTimesFit} from '../../.storybook/fit'
import {TimeCell, TimeModeButton} from './TimeCell'

const meta = {title: 'Components/TimeCell'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString()
const TIMES = [ago(8), ago(25 * 60), ago(7 * 3600), ago(40 * 86400)]

function Column() {
    return (
        <table className="text-sm">
            <thead>
                <tr>
                    <th className="pb-2 text-left font-normal">
                        <TimeModeButton />
                    </th>
                </tr>
            </thead>
            <tbody className="text-muted-foreground">
                {TIMES.map(iso => (
                    <tr key={iso}>
                        <td className="py-1.5">
                            <TimeCell iso={iso} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function Standalone() {
    return (
        <div className="space-y-2 text-xs text-muted-foreground">
            {TIMES.map(iso => (
                <div key={iso}>
                    <TimeCell iso={iso} cycle />
                </div>
            ))}
        </div>
    )
}

// the timezone is one switch every cell shares, so each story sets it instead of trusting the one before
const inTimezone = (local: boolean): Story => ({
    beforeEach: () => () => localStorage.removeItem('timeMode'),
    play: async ({canvas, userEvent}) => {
        const toggle = canvas.getAllByRole('button', {name: 'Switch timezone'})[0]
        if ((toggle.getAttribute('aria-pressed') === 'true') !== local) await userEvent.click(toggle)
        await expect(toggle).toHaveAttribute('aria-pressed', String(local))
    },
})

export const TableColumnUtc: Story = {...inTimezone(false), render: () => <Column />}

export const TableColumnLocal: Story = {...inTimezone(true), render: () => <Column />}

export const StandaloneUtc: Story = {...inTimezone(false), render: () => <Standalone />}

export const StandaloneLocal: Story = {...inTimezone(true), render: () => <Standalone />}

// a box too narrow for the whole stamp breaks it after the age first, and
// splits the timezone off the date only once the date fills a line itself
export const WrapsInNarrowBoxes: Story = {
    ...inTimezone(false),
    render: () => (
        <div className="space-y-4 text-xs text-muted-foreground">
            {['w-80', 'w-55', 'w-42'].map(width => (
                <div key={width} className={width}>
                    <TimeCell iso={TIMES[3]} cycle />
                </div>
            ))}
        </div>
    ),
    play: async context => {
        await inTimezone(false).play!(context)
        expectTimesFit(context.canvasElement)
        const lines = [...context.canvasElement.querySelectorAll('.space-y-4 > div')].map(box => Math.round(box.clientHeight / parseFloat(getComputedStyle(box).lineHeight)))
        await expect(lines).toEqual([1, 2, 3])
    },
}
