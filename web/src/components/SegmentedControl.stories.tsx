import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {Tabs, TabsContent} from '@/components/ui/tabs'
import {all, linksByKeyboard, linkStrip} from '../../.storybook/fit'
import SegmentedControl, {type SegmentLink} from './SegmentedControl'

const meta = {title: 'Components/SegmentedControl'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
type Play = NonNullable<Story['play']>

const links = (labels: string[], active: number): SegmentLink[] => labels.map((label, i) => ({label, href: `?r=${label.toLowerCase()}`, active: i === active}))

const RANGES = ['30D', '90D', '365D', 'ALL']

const VIEWS: [string, string][] = [
    ['table', 'Table'],
    ['json', 'JSON'],
]

// a strip stands one control tall, like the dropdowns and buttons beside it
const tall =
    (role: 'navigation' | 'tablist', px: number): Play =>
    async ({canvas}) =>
        expect(canvas.getByRole(role).getBoundingClientRect().height).toBe(px)

// the picked option stands apart from the strip and from the unpicked ones
const tinted =
    (picked: string, rest: string): Play =>
    async ({canvasElement}) => {
        const on = canvasElement.querySelector<HTMLElement>(picked)!
        await expect(getComputedStyle(on).backgroundColor).not.toBe(getComputedStyle(on.parentElement!).backgroundColor)
        await expect(getComputedStyle(on).color).not.toBe(getComputedStyle(canvasElement.querySelector(rest)!).color)
        await expect(getComputedStyle(on).fontWeight).toBe('500')
    }

export const Links: Story = {
    render: () => <SegmentedControl aria-label="Range" options={links(RANGES, 2)} />,
    play: all(
        linkStrip('Range', '365D'),
        linksByKeyboard,
        tall('navigation', 32),
        tinted('[aria-current=page]', 'nav a:not([aria-current])')
    ),
}

// the presets of a chart set to a custom date range
export const LinksNoneActive: Story = {render: () => <SegmentedControl aria-label="Range" options={links(RANGES, -1)} />, play: linkStrip('Range')}

const Views = ({size}: {size?: 'sm'}) => (
    <Tabs defaultValue="table">
        <SegmentedControl options={VIEWS} size={size} />
        <TabsContent value="table">table view</TabsContent>
        <TabsContent value="json">json view</TabsContent>
    </Tabs>
)

// switches panels already on the page, the picked tab showing its panel
export const Panels: Story = {
    render: () => <Views />,
    play: all(tall('tablist', 32), async ({canvas, userEvent}) => {
        await expect(canvas.getByRole('tab', {name: 'Table'})).toHaveAttribute('aria-selected', 'true')
        await expect(canvas.getByText('table view')).toBeVisible()
        await userEvent.click(canvas.getByRole('tab', {name: 'JSON'}))
        await expect(canvas.getByText('json view')).toBeVisible()
        await expect(canvas.queryByText('table view')).toBeNull()
    }),
}

export const PanelsSmall: Story = {render: () => <Views size="sm" />, play: tall('tablist', 24)}

// tailwind spells no shadow as a stack of transparent layers, the browser default as none
const visibleShadow = (el: Element) =>
    getComputedStyle(el)
        .boxShadow.split(/,(?![^(]*\))/)
        .map(layer => layer.trim())
        .filter(layer => layer !== 'none' && !layer.startsWith('rgba(0, 0, 0, 0)'))

// links and tabs read as one control, the picked option painted the same in both
export const OneLook: Story = {
    render: () => (
        <div className="space-y-3">
            <SegmentedControl aria-label="Range" options={links(RANGES, 2)} />
            <Views />
        </div>
    ),
    play: all(
        tinted('[role=tab][aria-selected=true]', '[role=tab][aria-selected=false]'),
        async ({canvas}) => {
            const link = within(canvas.getByRole('navigation', {name: 'Range'})).getByRole('link', {current: 'page'})
            const tab = canvas.getByRole('tab', {selected: true})
            for (const prop of ['backgroundColor', 'color', 'fontWeight', 'borderTopLeftRadius'] as const) {
                await expect(getComputedStyle(tab)[prop]).toBe(getComputedStyle(link)[prop])
            }
            await expect(visibleShadow(tab)).toEqual(visibleShadow(link))
            await expect(tab.getBoundingClientRect().height).toBe(link.getBoundingClientRect().height)
        }
    ),
}
