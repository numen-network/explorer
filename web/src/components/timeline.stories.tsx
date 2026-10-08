import type {Meta, StoryObj} from '@storybook/nextjs-vite'
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

export const StepLinksWithAndWithoutExtrinsic: Story = {
    render: () => (
        <TimelineList>
            <TimelineItem tone="idle" icon={RING} title="Raised by an extrinsic" iso={ISO} links={<StepLinks block={520_000} event={{indexInBlock: 7, extrinsic: {id: '0000520000-00000-000003'}}} />} />
            <TimelineItem tone="primary" icon={RING} title="Raised by the runtime" iso={ISO} links={<StepLinks block={521_440} event={{indexInBlock: 0, extrinsic: null}} />} />
        </TimelineList>
    ),
    play: async ({canvasElement}) => expectTimesFit(canvasElement),
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
                            ['A value long enough to wrap', '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1'],
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
    ),
    play: async ({canvas, canvasElement}) => {
        expectWholeWords(canvas.getByText(AMOUNT), canvas.getByText(PROSE))
        expectFits(...canvasElement.querySelectorAll('dd'))
    },
}
