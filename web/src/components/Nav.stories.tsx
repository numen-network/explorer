import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, fireEvent, screen, within} from 'storybook/test'
import {DESKTOP, expectFits, expectNamedNavs, PHONE} from '../../.storybook/fit'
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

export const HomeActive: Story = {parameters: at('/'), play: current('/')}

export const SectionActive: Story = {parameters: at('/blocks'), play: current('/blocks')}

// the section lights up, but its link is not this page
export const NestedRouteActive: Story = {parameters: at('/charts/transfer-volume'), play: current()}

export const DetailRouteNoneActive: Story = {parameters: at('/block/1000000'), play: current()}

// the row of links shows from xl up
export const WideScreen: Story = {
    globals: DESKTOP,
    parameters: at('/governance'),
    play: async ({canvas, canvasElement}) => {
        expectNamedNavs(canvasElement)
        await expect(hrefs(within(canvas.getByRole('navigation', {name: 'Main'})).getAllByRole('link', {current: 'page'}))).toEqual(['/governance'])
    },
}

export const NoChainName: Story = {args: {chain: ''}, parameters: at('/')}

export const LongChainName: Story = {args: {chain: 'Numen Integration Testnet'}, parameters: at('/governance')}

export const LongChainNameOnPhone: Story = {
    ...LongChainName,
    globals: PHONE,
    play: async ({canvasElement}) => expectFits(canvasElement.querySelector('header > div')!),
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
