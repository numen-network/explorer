import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, fireEvent, screen, within} from 'storybook/test'
import {all, expectFits, expectNamedNavs} from '../../.storybook/fit'
import Nav from './Nav'

const meta = {
    title: 'Components/Nav',
    component: Nav,
    args: {chain: 'Numen Mainnet'},
    parameters: {layout: 'fullscreen'},
} satisfies Meta<typeof Nav>
export default meta
type Story = StoryObj<typeof meta>

const at = (pathname: string) => ({nextjs: {navigation: {pathname}}})

const hrefs = (links: HTMLElement[]) => links.map(link => link.getAttribute('href'))

// only the item linking to the page being read is current, and the row
// only shows from xl, so hidden links count too
const current =
    (href?: string): Story['play'] =>
    async ({canvas}) =>
        expect(hrefs(canvas.queryAllByRole('link', {hidden: true, current: 'page'}))).toEqual(href ? [href] : [])

// the item of the section being read takes the accent, on its own page or one below it
const lit =
    (href?: string): Story['play'] =>
    async ({canvas}) =>
        expect(hrefs(canvas.queryAllByRole('link', {hidden: true}).filter(link => link.classList.contains('text-primary')))).toEqual(href ? [href] : [])

export const HomeActive: Story = {parameters: at('/'), play: all(lit('/')!, current('/')!)}

export const SectionActive: Story = {parameters: at('/blocks'), play: all(lit('/blocks')!, current('/blocks')!)}

// the section lights up, but its link is not this page
export const NestedRouteActive: Story = {parameters: at('/charts/transfer-volume'), play: all(lit('/charts')!, current()!)}

export const DetailRouteNoneActive: Story = {parameters: at('/block/1000000'), play: all(lit()!, current()!)}

export const EventsActive: Story = {parameters: at('/events'), play: all(lit('/events')!, current('/events')!)}

// /event/<id> shares a prefix with /events without belonging to it
export const EventDetailNoneActive: Story = {parameters: at('/event/1000000-3'), play: all(lit()!, current()!)}

export const NoChainName: Story = {args: {chain: ''}, parameters: at('/')}

export const LongChainName: Story = {
    args: {chain: 'Numen Integration Testnet'},
    parameters: at('/governance'),
    play: async ({canvasElement}) => expectFits(canvasElement.querySelector('header > div')!),
}

// from xl up the row shows its links, below it the burger stands in
export const RowFromXlBurgerBelow: Story = {
    parameters: at('/accounts'),
    play: async ({canvas}) => {
        const wide = matchMedia('(width >= 80rem)').matches
        await expect({row: canvas.queryByRole('navigation', {name: 'Main'}) !== null, burger: canvas.queryByRole('button', {name: 'Menu'}) !== null}).toEqual({row: wide, burger: !wide})
    },
}

// the burger only shows below xl, a click event still reaches it on a wide screen
export const MenuOpen: Story = {
    parameters: at('/transfers'),
    play: async ({canvas}) => {
        await fireEvent.click(canvas.getByLabelText('Menu'))
        const menu = await screen.findByRole('dialog')
        expectNamedNavs(document.body)
        await expect(hrefs(within(menu).queryAllByRole('link', {current: 'page'}))).toEqual(['/transfers'])
    },
}
