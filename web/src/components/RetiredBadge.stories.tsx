import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {BlockLink} from './links'
import RetiredBadge from './RetiredBadge'

const meta = {title: 'Components/RetiredBadge', component: RetiredBadge} satisfies Meta<typeof RetiredBadge>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const InRegistrarLines: Story = {
    render: () => (
        <div className="grid gap-3 text-sm">
            <span className="flex items-center gap-2">
                <RetiredBadge />
                <BlockLink height={950_000} />
            </span>
            <span className="flex items-center gap-1.5">
                <span className="text-xs text-dim">registrar #2</span>
                <RetiredBadge />
            </span>
        </div>
    ),
}
