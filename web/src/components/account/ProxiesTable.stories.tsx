import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, screen} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {fmtSpan} from '@/lib/format'
import type {ProxyRow} from '@/lib/gql'
import {CHAIN, proxyDelegates, proxyFor} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {ProxiesTable} from './ProxiesTable'

const meta = {title: 'Pages/Account/Proxies'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (label: string, rows: ProxyRow[]) => (
    <Card size="flush">
        <ProxiesTable label={label} rows={rows} chain={CHAIN} />
    </Card>
)

// a page past the last leaves the Proxy for list empty, Delegates to only shows with rows
export const InEmpty: Story = {render: () => table('Proxy for', [])}

export const InOne: Story = {render: () => table('Proxy for', proxyFor(1))}

const delays = (root: HTMLElement) => [...root.querySelectorAll('tbody tr')].map(tr => tr.lastElementChild!.textContent)
const after = (blocks: number) => fmtSpan(blocks * CHAIN.blockTime)

// three types against three delays, no delay first, a delay read in blocks and the time they take
export const EveryTypeAndDelay: Story = {
    render: () => table('Delegates to', proxyDelegates(9)),
    play: ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Type')).toEqual(Array.from({length: 9}, (_, i) => ['Any', 'Governance', 'NonTransfer'][i % 3]))
        expect(delays(canvasElement)).toEqual([...Array(3).fill('—'), ...Array(3).fill(`100 blocks ≈ ${after(100)}`), ...Array(3).fill(`14,400 blocks ≈ ${after(14_400)}`)])
    },
}

// a type's badge names on hover what the runtime lets a proxy of it call
const scope = (proxyType: string, lines: string[]): Story => ({
    render: () => table('Delegates to', proxyDelegates(1).map((p: ProxyRow) => ({...p, proxyType}))),
    play: async ({canvas, userEvent}) => {
        await userEvent.hover(canvas.getByText(proxyType))
        const tip = await screen.findByRole('tooltip')
        await expect([...tip.querySelectorAll('span > span')].map(s => s.textContent)).toEqual(lines)
    },
})

export const AnyScope = scope('Any', ['Can call anything, transfers included'])

export const NonTransferScope = scope('NonTransfer', ['Can call anything except', 'Balances', 'EVM', 'Ethereum', 'Vesting.vested_transfer'])

export const GovernanceScope = scope('Governance', ['Can only call', 'Treasury', 'Bounties', 'ChildBounties', 'ConvictionVoting', 'Referenda', 'Utility'])

// a type a later runtime brings in still shows, with nothing on hover
export const UnknownType: Story = {
    render: () => table('Delegates to', proxyDelegates(1).map((p: ProxyRow) => ({...p, proxyType: 'Staking'}))),
    play: async ({canvas, userEvent}) => {
        await userEvent.hover(canvas.getByText('Staking'))
        await new Promise(r => setTimeout(r, 800))
        await expect(screen.queryByRole('tooltip')).toBeNull()
    },
}
