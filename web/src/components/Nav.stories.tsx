import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, fireEvent, screen} from 'storybook/test'
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

export const HomeActive: Story = {parameters: at('/')}

export const SectionActive: Story = {parameters: at('/blocks')}

export const NestedRouteActive: Story = {parameters: at('/charts/transfer-volume')}

export const DetailRouteNoneActive: Story = {parameters: at('/block/1000000')}

export const NoChainName: Story = {args: {chain: ''}, parameters: at('/')}

export const LongChainName: Story = {args: {chain: 'Numen Integration Testnet'}, parameters: at('/governance')}

// the burger only shows below xl, a click event still reaches it on a wide screen
export const MenuOpen: Story = {
    parameters: at('/transfers'),
    play: async ({canvas}) => {
        await fireEvent.click(canvas.getByLabelText('Menu'))
        await expect(await screen.findByRole('dialog')).toBeInTheDocument()
    },
}
