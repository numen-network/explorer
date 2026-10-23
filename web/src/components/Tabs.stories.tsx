import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {Tabs, TabsContent} from '@/components/ui/tabs'
import {all, expectArrowsOnLabelLine, tabCount} from '../../.storybook/fit'
import {TabNav, TabSwitch, panelTabs, type Panel, type TabItem} from './Tabs'

const meta = {title: 'Components/Tabs'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
type Play = NonNullable<Story['play']>

const items = (labels: string[], active: number, counts?: number[]): TabItem[] =>
    labels.map((label, i) => ({label, href: `?tab=${label.toLowerCase()}`, active: i === active, count: counts?.[i]}))

const ACCOUNT_TABS = ['Extrinsics', 'Transfers', 'Tokens', 'Identity', 'Judgements', 'Subs', 'Votes', 'Delegations', 'Proxies', 'Multisig', 'Locks', 'Vesting', 'Mining', 'Validator']

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

// the open page's link is scrolled into the strip, clear of the arrows, which
// sit on the label line
const currentInView: Play = async ({canvas, canvasElement}) => {
    await canvas.findByRole('button', {name: 'Scroll left'})
    const link = canvas.getByRole('link', {current: 'page'}).getBoundingClientRect()
    const strip = canvasElement.querySelector('.overflow-x-auto')!.getBoundingClientRect()
    const arrows = canvas.getAllByRole('button').map(b => b.getBoundingClientRect())
    await expect(link.left >= strip.left && link.right <= strip.right && arrows.every(a => link.right <= a.left || link.left >= a.right)).toBe(true)
    expectArrowsOnLabelLine(canvasElement)
}

const panel = (label: string, count?: number): Panel => ({
    slug: label.toLowerCase(),
    label,
    count,
    body: () => <Card className="px-5 py-6 text-sm text-muted-foreground">{label} panel</Card>,
})

export const LineSingleTab: Story = {render: () => <TabNav aria-label="Account" items={items(['Transfers'], 0, [42])} />, play: linkStrip('Account', 'Transfers')}

const TOKEN_TABS = items(['Holders', 'Transfers', 'Contract'], 1, [0, 1, 1_234_567])

export const LineWithCounts: Story = {
    render: () => <TabNav aria-label="Token" items={TOKEN_TABS} />,
    play: all(linkStrip('Token', 'Transfers'), async ({canvasElement}) => expect(['holders', 'transfers', 'contract'].map(slug => tabCount(canvasElement, slug))).toEqual(['0', '1', '1,234,567'])),
}

export const LineKeyboard: Story = {render: () => <TabNav aria-label="Token" items={TOKEN_TABS} />, play: keyboard}

export const LineWithoutCounts: Story = {
    render: () => <TabNav aria-label="Governance" items={items(['Referenda', 'Treasury spends', 'Bounties', 'Tracks'], 0)} />,
    play: all(linkStrip('Governance', 'Referenda'), async ({canvasElement}) => expect(canvasElement.querySelector('[data-slot=badge]')).toBeNull()),
}

// a strip as narrow as a phone's
export const LineOverflowing: Story = {
    render: () => (
        <div className="max-w-80">
            <TabNav aria-label="Account" items={items(ACCOUNT_TABS, 12, ACCOUNT_TABS.map((_, i) => i * 37))} />
        </div>
    ),
    play: all(linkStrip('Account', 'Mining'), currentInView),
}

export const LineNoneActive: Story = {render: () => <TabNav aria-label="Token" items={items(['Holders', 'Transfers', 'Contract'], -1)} />, play: linkStrip('Token')}

// pill and segment strips stand one control tall, like the dropdowns and buttons beside them
const controlHeight =
    (name: string): Play =>
    async ({canvas}) =>
        expect(canvas.getByRole('navigation', {name}).getBoundingClientRect().height).toBe(32)

export const Pill: Story = {render: () => <TabNav aria-label="Range" variant="pill" items={items(['30D', '90D', '365D', 'ALL'], 2)} />, play: all(linkStrip('Range', '365D'), keyboard, controlHeight('Range'))}

// the presets of a chart set to a custom date range
export const PillNoneActive: Story = {render: () => <TabNav aria-label="Range" variant="pill" items={items(['30D', '90D', '365D', 'ALL'], -1)} />, play: linkStrip('Range')}

// tailwind spells no shadow as a stack of transparent layers, the browser default as none
const visibleShadow = (el: Element) =>
    getComputedStyle(el)
        .boxShadow.split(/,(?![^(]*\))/)
        .map(layer => layer.trim())
        .filter(layer => layer !== 'none' && !layer.startsWith('rgba(0, 0, 0, 0)'))

// switches a view in place with the pill look, so it reads as the same control as the Range strip
export const PillSwitch: Story = {
    render: () => (
        <div className="space-y-3">
            <TabNav aria-label="Range" variant="pill" items={items(['30D', '90D', '365D', 'ALL'], 2)} />
            <Tabs defaultValue="table">
                <TabSwitch
                    options={[
                        ['table', 'Table'],
                        ['json', 'JSON'],
                    ]}
                />
                <TabsContent value="table">table view</TabsContent>
                <TabsContent value="json">json view</TabsContent>
            </Tabs>
        </div>
    ),
    play: async ({canvas, userEvent}) => {
        const pill = within(canvas.getByRole('navigation', {name: 'Range'})).getByRole('link', {current: 'page'})
        const active = canvas.getByRole('tab', {name: 'Table'})
        await expect(canvas.getByRole('tablist').getBoundingClientRect().height).toBe(32)
        await expect(getComputedStyle(active).backgroundColor).toBe(getComputedStyle(pill).backgroundColor)
        await expect(visibleShadow(active)).toEqual(visibleShadow(pill))
        await expect(active.getBoundingClientRect().height).toBe(pill.getBoundingClientRect().height)
        await expect(canvas.getByText('table view')).toBeVisible()
        await userEvent.click(canvas.getByRole('tab', {name: 'JSON'}))
        await expect(canvas.getByText('json view')).toBeVisible()
    },
}

export const PillSwitchSmall: Story = {
    render: () => (
        <Tabs defaultValue="table">
            <TabSwitch
                options={[
                    ['table', 'Table'],
                    ['json', 'JSON'],
                ]}
                size="sm"
            />
        </Tabs>
    ),
    play: async ({canvas}) => expect(canvas.getByRole('tablist').getBoundingClientRect().height).toBe(24),
}

export const Segment: Story = {render: () => <TabNav aria-label="Window" variant="segment" items={items(['24h', '7d', '30d'], 0)} />, play: all(linkStrip('Window', '24h'), keyboard, controlHeight('Window'))}

export const SegmentLastActive: Story = {render: () => <TabNav aria-label="Window" variant="segment" items={items(['24h', '7d', '30d'], 2)} />, play: linkStrip('Window', '30d')}

const PANELS = [panel('Events', 7), panel('Calls', 3), panel('Logs')]

// a page's own strip over its open panel, laid out the way the pages do it
const PanelsPage = ({at}: {at: string}) => {
    const tabs = panelTabs(PANELS, at, s => `?tab=${s}`)
    return (
        <>
            <TabNav aria-label="Block" items={tabs.items} />
            <div className="mt-4">{tabs.active.body()}</div>
        </>
    )
}

const opens =
    (current: string): Play =>
    async ({canvas}) => {
        await expect(within(canvas.getByRole('navigation', {name: 'Block'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(new RegExp(`^${current}`))
        await expect(canvas.getByText(`${current} panel`)).toBeVisible()
    }

export const PanelsSecondActive: Story = {render: () => <PanelsPage at="calls" />, play: all(linkStrip('Block', 'Calls'), opens('Calls'))}

// an unknown slug opens the first panel
export const PanelsUnknownSlug: Story = {render: () => <PanelsPage at="nope" />, play: all(linkStrip('Block', 'Events'), opens('Events'))}
