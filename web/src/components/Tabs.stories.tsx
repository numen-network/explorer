import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {PHONE} from '../../.storybook/fit'
import {TabBar, TabPanels, type Panel, type TabItem} from './Tabs'

const meta = {title: 'Components/Tabs'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
type Play = NonNullable<Story['play']>

const items = (labels: string[], active: number, counts?: number[]): TabItem[] =>
    labels.map((label, i) => ({label, href: `?tab=${label.toLowerCase()}`, active: i === active, count: counts?.[i]}))

const ACCOUNT_TABS = ['Extrinsics', 'Transfers', 'Tokens', 'Identity', 'Judgements', 'Subs', 'Votes', 'Delegations', 'Proxies', 'Multisig', 'Locks', 'Vesting', 'Mining', 'Validator']

const all =
    (...plays: Play[]): Play =>
    async context => {
        for (const play of plays) await play(context)
    }

// a named nav of links that marks only the open page current, with no tab
// roles and no aria-controls naming an element that isn't there
const linkStrip =
    (name: string, current?: string): Play =>
    async ({canvas, canvasElement}) => {
        const nav = canvas.getByRole('navigation', {name})
        await expect(canvas.queryAllByRole('tablist')).toEqual([])
        await expect(canvas.queryAllByRole('tab')).toEqual([])
        const dangling = [...canvasElement.querySelectorAll('[aria-controls]')].filter(el => el.getAttribute('aria-controls')!.split(' ').some(id => !document.getElementById(id)))
        await expect(dangling).toEqual([])
        const marked = within(nav).queryAllByRole('link', {current: 'page'})
        await expect(marked).toHaveLength(current ? 1 : 0)
        if (current) await expect(marked[0]).toHaveAccessibleName(new RegExp(`^${current}`))
    }

// the tab key stops on every link in turn, and enter follows the focused one
const keyboard: Play = async ({canvas, canvasElement, userEvent}) => {
    const links = canvas.getAllByRole('link')
    for (const link of links) {
        await userEvent.tab()
        await expect(link).toHaveFocus()
    }
    const followed: (string | null)[] = []
    canvasElement.addEventListener('click', e => followed.push((e.target as Element).closest('a')!.getAttribute('href')))
    await userEvent.keyboard('{Enter}')
    await expect(followed).toEqual([links.at(-1)!.getAttribute('href')])
}

// the open page's link is scrolled into the strip, clear of the arrows
const currentInView: Play = async ({canvas, canvasElement}) => {
    await canvas.findByRole('button', {name: 'Scroll left'})
    const link = canvas.getByRole('link', {current: 'page'}).getBoundingClientRect()
    const strip = canvasElement.querySelector('.overflow-x-auto')!.getBoundingClientRect()
    const arrows = canvas.getAllByRole('button').map(b => b.getBoundingClientRect())
    await expect(link.left >= strip.left && link.right <= strip.right && arrows.every(a => link.right <= a.left || link.left >= a.right)).toBe(true)
}

// the open tab controls the panel under the strip
const panelShown: Play = async ({canvas}) => {
    await expect(canvas.getByRole('tab', {selected: true})).toHaveAttribute('aria-controls', canvas.getByRole('tabpanel').id)
}

const panel = (label: string, count?: number): Panel => ({
    slug: label.toLowerCase(),
    label,
    count,
    body: () => <Card className="px-5 py-6 text-sm text-muted-foreground">{label} panel</Card>,
})

export const LineSingleTab: Story = {render: () => <TabBar aria-label="Account" items={items(['Transfers'], 0, [42])} />, play: linkStrip('Account', 'Transfers')}

export const LineWithCounts: Story = {
    render: () => <TabBar aria-label="Token" items={items(['Holders', 'Transfers', 'Contract'], 1, [0, 1, 1_234_567])} />,
    play: all(linkStrip('Token', 'Transfers'), keyboard),
}

export const LineWithoutCounts: Story = {
    render: () => <TabBar aria-label="Governance" items={items(['Referenda', 'Treasury spends', 'Bounties', 'Tracks'], 0)} />,
    play: linkStrip('Governance', 'Referenda'),
}

export const LineOverflowing: Story = {
    render: () => <TabBar aria-label="Account" items={items(ACCOUNT_TABS, 9, ACCOUNT_TABS.map((_, i) => i * 37))} />,
    play: linkStrip('Account', 'Multisig'),
}

export const LineOverflowingOnPhone: Story = {
    globals: PHONE,
    render: () => <TabBar aria-label="Account" items={items(ACCOUNT_TABS, 12, ACCOUNT_TABS.map((_, i) => i * 37))} />,
    play: all(linkStrip('Account', 'Mining'), currentInView),
}

export const LineNoneActive: Story = {render: () => <TabBar aria-label="Token" items={items(['Holders', 'Transfers', 'Contract'], -1)} />, play: linkStrip('Token')}

export const Pill: Story = {render: () => <TabBar aria-label="Range" variant="pill" items={items(['30D', '90D', '365D', 'ALL'], 2)} />, play: all(linkStrip('Range', '365D'), keyboard)}

// the presets of a chart set to a custom date range
export const PillNoneActive: Story = {render: () => <TabBar aria-label="Range" variant="pill" items={items(['30D', '90D', '365D', 'ALL'], -1)} />, play: linkStrip('Range')}

export const Segment: Story = {render: () => <TabBar aria-label="Window" variant="segment" items={items(['24h', '7d', '30d'], 0)} />, play: all(linkStrip('Window', '24h'), keyboard)}

export const SegmentLastActive: Story = {render: () => <TabBar aria-label="Window" variant="segment" items={items(['24h', '7d', '30d'], 2)} />, play: linkStrip('Window', '30d')}

export const PanelsSingle: Story = {render: () => <TabPanels panels={[panel('Events', 7)]} href={s => `?tab=${s}`} />}

export const PanelsSecondActive: Story = {render: () => <TabPanels panels={[panel('Events', 7), panel('Calls', 3), panel('Logs')]} at="calls" href={s => `?tab=${s}`} />, play: panelShown}

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
