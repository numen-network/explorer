import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {all, expectArrowsOnLabelLine, linksByKeyboard, linkStrip, tabCount} from '../../.storybook/fit'
import {TabNav, panelTabs, type Panel, type TabItem} from './Tabs'

const meta = {title: 'Components/Tabs'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
type Play = NonNullable<Story['play']>

const items = (labels: string[], active: number, counts?: number[]): TabItem[] =>
    labels.map((label, i) => ({label, href: `?tab=${label.toLowerCase()}`, active: i === active, count: counts?.[i]}))

const ACCOUNT_TABS = ['Extrinsics', 'Transfers', 'Tokens', 'Identity', 'Judgements', 'Subs', 'Votes', 'Delegations', 'Proxies', 'Multisig', 'Locks', 'Vesting', 'Mining', 'Validator']

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

export const LineKeyboard: Story = {render: () => <TabNav aria-label="Token" items={TOKEN_TABS} />, play: linksByKeyboard}

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
