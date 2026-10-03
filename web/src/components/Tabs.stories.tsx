import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import {TabBar, TabPanels, type Panel, type TabItem} from './Tabs'

const meta = {title: 'Components/Tabs'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const items = (labels: string[], active: number, counts?: number[]): TabItem[] =>
    labels.map((label, i) => ({label, href: `?tab=${label.toLowerCase()}`, active: i === active, count: counts?.[i]}))

const ACCOUNT_TABS = ['Extrinsics', 'Transfers', 'Tokens', 'Identity', 'Judgements', 'Subs', 'Votes', 'Delegations', 'Proxies', 'Multisig', 'Locks', 'Vesting', 'Mining', 'Validator']

const panel = (label: string, count?: number): Panel => ({
    slug: label.toLowerCase(),
    label,
    count,
    body: () => <Card className="px-5 py-6 text-sm text-muted-foreground">{label} panel</Card>,
})

export const LineSingleTab: Story = {render: () => <TabBar items={items(['Transfers'], 0, [42])} />}

export const LineWithCounts: Story = {render: () => <TabBar items={items(['Holders', 'Transfers', 'Contract'], 1, [0, 1, 1_234_567])} />}

export const LineWithoutCounts: Story = {render: () => <TabBar items={items(['Referenda', 'Treasury spends', 'Bounties', 'Tracks'], 0)} />}

export const LineOverflowing: Story = {render: () => <TabBar items={items(ACCOUNT_TABS, 9, ACCOUNT_TABS.map((_, i) => i * 37))} />}

export const LineNoneActive: Story = {render: () => <TabBar items={items(['Holders', 'Transfers', 'Contract'], -1)} />}

export const Pill: Story = {render: () => <TabBar variant="pill" items={items(['30D', '90D', '365D', 'ALL'], 2)} />}

export const PillNoneActive: Story = {render: () => <TabBar variant="pill" items={items(['30D', '90D', '365D', 'ALL'], -1)} />}

export const Segment: Story = {render: () => <TabBar variant="segment" items={items(['24h', '7d', '30d'], 0)} />}

export const SegmentLastActive: Story = {render: () => <TabBar variant="segment" items={items(['24h', '7d', '30d'], 2)} />}

export const PanelsSingle: Story = {render: () => <TabPanels panels={[panel('Events', 7)]} href={s => `?tab=${s}`} />}

export const PanelsSecondActive: Story = {render: () => <TabPanels panels={[panel('Events', 7), panel('Calls', 3), panel('Logs')]} at="calls" href={s => `?tab=${s}`} />}

export const PanelsUnknownSlug: Story = {render: () => <TabPanels panels={[panel('Events', 7), panel('Calls', 3)]} at="nope" href={s => `?tab=${s}`} />}

export const PanelsOverflowing: Story = {render: () => <TabPanels panels={ACCOUNT_TABS.map((label, i) => panel(label, i * 1_111))} at="mining" href={s => `?tab=${s}`} />}

export const PanelsEmpty: Story = {
    render: () => (
        <div className="text-sm text-muted-foreground">
            <TabPanels panels={[]} href={s => s} />
            No panels, nothing above this line
        </div>
    ),
}
