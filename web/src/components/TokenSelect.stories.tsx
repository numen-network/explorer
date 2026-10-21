import type {Decorator, Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {WellKnownProvider} from '@/components/wellKnown'
import {chainInfo} from '../../../mock/fixtures.js'
import {filterOptions} from '../../.storybook/fit'
import TokenSelect from './TokenSelect'

const icons: Decorator = Story => (
    <WellKnownProvider treasury="" prime="" evmChainId={chainInfo.evmChainId}>
        <Story />
    </WellKnownProvider>
)

const meta = {title: 'Pages/Account/Transfers | Counterparties', decorators: [icons]} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const WTMR = '0xa1795b3c6f74866c7def1df390f9e2e403dca2e9'
const ORB = '0xe1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1'
const NAMELESS = '0xe2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2'

// a listed token with an icon, one with a symbol but no icon, and one that answered no symbol
const TOKENS = [
    {id: WTMR, symbol: 'WTMR', decimals: 18},
    {id: ORB, symbol: 'ORB', decimals: 6},
    {id: NAMELESS, symbol: null, decimals: null},
]

const href = (id: string) => `/account/x?tab=counterparties&token=${id}`

// whether each option in the open list wears an icon
async function optionIcons(root: HTMLElement) {
    await userEvent.click(within(root).getByRole('combobox', {name: 'Token'}))
    const icons = within(await within(document.body).findByRole('listbox'))
        .getAllByRole('option')
        .map(o => o.querySelector('img') != null)
    await userEvent.keyboard('{Escape}')
    return icons
}

// the chain's own coin leads under the logo, the way the counterparty tab picks one asset
export const SelectWithNative: Story = {
    render: () => <TokenSelect tokens={TOKENS} native="NUMN" value={WTMR} href={href} />,
    play: async ({canvasElement}) => {
        expect(within(canvasElement).getByRole('combobox', {name: 'Token'})).toHaveTextContent(/^WTMR0xa179…a2e9$/)
        expect(await filterOptions(canvasElement, 'Token')).toEqual(['NUMN', '[WTMR 0xa179…a2e9]', 'ORB 0xe1e1…e1e1', '0xe2e2…e2e2'])
        expect(await optionIcons(canvasElement)).toEqual([true, true, false, false])
    },
}

// an account that never moved the native coin picks among its tokens alone
export const SelectTokensOnly: Story = {
    render: () => <TokenSelect tokens={TOKENS} value={NAMELESS} href={href} />,
    play: async ({canvasElement}) => {
        expect(within(canvasElement).getByRole('combobox', {name: 'Token'})).toHaveTextContent(/^0xe2e2…e2e2$/)
        expect(await filterOptions(canvasElement, 'Token')).toEqual(['WTMR 0xa179…a2e9', 'ORB 0xe1e1…e1e1', '[0xe2e2…e2e2]'])
    },
}

// as a filter it leads with All, which carries no icon or contract
export const SelectWithAll: Story = {
    render: () => <TokenSelect tokens={TOKENS} all value="" href={href} />,
    play: async ({canvasElement}) => {
        expect(within(canvasElement).getByRole('combobox', {name: 'Token'})).toHaveTextContent(/^All$/)
        expect(await filterOptions(canvasElement, 'Token')).toEqual(['[All]', 'WTMR 0xa179…a2e9', 'ORB 0xe1e1…e1e1', '0xe2e2…e2e2'])
        expect(await optionIcons(canvasElement)).toEqual([false, true, false, false])
    },
}
