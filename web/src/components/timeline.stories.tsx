import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {CROSS, RING, StepLinks, TICK, TimelineItem, TimelineList, TimelineRows} from './timeline'

const meta = {title: 'Governance/Timeline'} satisfies Meta
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
