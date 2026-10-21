import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {BlockLink} from './links'
import RetiredBadge from './RetiredBadge'

const meta = {title: 'Components/RetiredBadge', component: RetiredBadge} satisfies Meta<typeof RetiredBadge>
export default meta
type Story = StoryObj<typeof meta>

// alone and before the block it retired at in the registrars table, after the
// seat number in received judgements, after the index in an identity timeline
export const EveryPlacement: Story = {
    render: () => (
        <div className="grid gap-3 text-sm">
            <span className="flex items-center gap-2">
                <RetiredBadge />
            </span>
            <span className="flex items-center gap-2">
                <RetiredBadge />
                <BlockLink height={950_000} />
            </span>
            <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-muted-foreground">#2</span>
                <RetiredBadge />
            </span>
            <span className="flex items-center gap-2">
                2<RetiredBadge />
            </span>
        </div>
    ),
}
