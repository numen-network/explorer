import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {expectFits, expectTimesFit, expectWholeWords} from '../../.storybook/fit'
import {CROSS, RING, StepLinks, TICK, TimelineItem, TimelineList, TimelineRows} from './timeline'

const meta = {title: 'Components/Timeline'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const ISO = '2026-09-30T12:00:00.000Z'

export const Empty: Story = {
    render: () => <TimelineList empty>{null}</TimelineList>,
}

export const EveryTone: Story = {
    render: () => (
        <TimelineList>
            <TimelineItem tone="idle" icon={RING} title="Submitted" iso={ISO} />
            <TimelineItem tone="primary" icon={RING} title="Deciding" iso={ISO} />
            <TimelineItem tone="warn" icon={RING} title="Confirming" iso={ISO} />
            <TimelineItem tone="pos" icon={TICK} title="Approved" iso={ISO} />
            <TimelineItem tone="neg" icon={CROSS} title="Killed" iso={ISO} />
        </TimelineList>
    ),
}

export const StepWithoutTime: Story = {
    render: () => (
        <TimelineList>
            <TimelineItem tone="idle" icon={RING} title="Submitted" />
        </TimelineList>
    ),
}

// the time under a step keeps to its column, the whole line or the narrow one beside a detail
export const StepTimeFits: Story = {
    render: () => (
        <TimelineList>
            <TimelineItem tone="idle" icon={RING} title="Submitted" iso={ISO} />
            <TimelineItem tone="pos" icon={TICK} title="Approved" iso={ISO} detail={<TimelineRows rows={[['Ayes', '3,200,000 NUMN']]} />} />
        </TimelineList>
    ),
    play: async ({canvasElement}) => expectTimesFit(canvasElement),
}

// a step links its block, its extrinsic when it has one and its event, each
// after a grey icon and nothing in place of a missing one, stacked below sm
export const StepLinksEveryForm: Story = {
    render: () => (
        <TimelineList>
            <TimelineItem tone="idle" icon={RING} title="Raised by an extrinsic" links={<StepLinks block={520_000} event={{indexInBlock: 7, extrinsic: {id: '0000520000-00000-000003'}}} />} />
            <TimelineItem tone="primary" icon={RING} title="Raised by the runtime" links={<StepLinks block={521_440} event={{indexInBlock: 0, extrinsic: null}} />} />
            <TimelineItem tone="idle" icon={RING} title="Known by its block alone" links={<StepLinks block={0} />} />
        </TimelineList>
    ),
    play: async ({canvasElement}) => {
        const steps = [...canvasElement.querySelectorAll('li')].map(step => [...step.querySelectorAll('a')])
        await expect(steps.map(links => links.map(link => link.textContent))).toEqual([['#520,000', '520000-3', '520000-7'], ['#521,440', '521440-0'], ['#0']])
        const items = steps.map(links => links.map(link => link.closest('[data-slot=step-link]')!))
        await expect(items.map(row => row[0].parentElement!.textContent)).toEqual(steps.map(links => links.map(link => link.textContent).join('')))
        for (const item of items.flat()) await expect(item.firstElementChild).toHaveClass('text-muted-foreground')
        const stacked = matchMedia('(width < 40rem)').matches
        for (const links of steps) {
            const tops = links.map(link => Math.round(link.getBoundingClientRect().top))
            await expect(new Set(tops).size).toBe(stacked ? tops.length : 1)
        }
    },
}

export const WithDetail: Story = {
    render: () => (
        <TimelineList>
            <TimelineItem
                tone="pos"
                icon={TICK}
                title="Approved"
                iso={ISO}
                detail={
                    <TimelineRows
                        rows={[
                            ['Ayes', '3,200,000 NUMN'],
                            ['Nays', '400,000 NUMN'],
                            ['Proposal hash', '0x' + 'a1'.repeat(32)],
                        ]}
                    />
                }
            />
        </TimelineList>
    ),
}

const AMOUNT = '1,000,000.12345678 NUMN'
const PROSE = "minted reward plus the miner's cut of any fees and tips paid here"

// a value column narrower than a value wraps its words whole and breaks the
// hash where the line runs out
export const DetailWraps: Story = {
    render: () => (
        <div className="max-w-md">
            <TimelineList>
                <TimelineItem
                    tone="idle"
                    icon={RING}
                    title="Submitted"
                    detail={
                        <TimelineRows
                            rows={[
                                ['Amount', AMOUNT],
                                ['Note', PROSE],
                                ['Hash', '0x' + 'a1'.repeat(32)],
                            ]}
                        />
                    }
                />
            </TimelineList>
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        expectWholeWords(canvas.getByText(AMOUNT), canvas.getByText(PROSE))
        expectFits(...canvasElement.querySelectorAll('dd'))
    },
}
