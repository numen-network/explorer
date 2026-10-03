import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {camelLabel} from '@/lib/format'
import {BOUNTY_STATUSES, CHILD_STATUSES} from '../../../mock/fixtures/governance.js'
import {bountyStatusTone, RefCell} from './bounties'
import {Badge} from './ui/badge'

const meta = {title: 'Components/Bounties'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

function Tones({label, statuses}: {label: string; statuses: string[]}) {
    return (
        <div className="py-2">
            <div className="mb-2 text-xs text-muted-foreground">{label}</div>
            <div className="flex flex-wrap gap-2">
                {statuses.map(s => (
                    <Badge key={s} variant={bountyStatusTone(s)}>
                        {camelLabel(s)}
                    </Badge>
                ))}
            </div>
        </div>
    )
}

export const StatusTones: Story = {
    render: () => (
        <>
            <Tones label="Bounty" statuses={BOUNTY_STATUSES} />
            <Tones label="Child bounty" statuses={CHILD_STATUSES} />
            <Tones label="A status the runtime adds later" statuses={['SomethingNew']} />
        </>
    ),
}

export const ReferendumCell: Story = {
    render: () => (
        <div className="flex gap-6 text-sm">
            <RefCell r={{index: 42, status: 'Approved'}} />
            <RefCell r={null} />
        </div>
    ),
}
