import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {EVERY_HOLDING, holding, NUMN, pair, token, units, WTMR} from '../../../mock/fixtures/evm.js'
import {Card} from './ui/card'
import HoldingsTable from './HoldingsTable'

const meta = {
    title: 'Pages/Account/Tokens',
    component: HoldingsTable,
    decorators: [Story => <Card size="flush">{Story()}</Card>],
} satisfies Meta<typeof HoldingsTable>
export default meta
type Story = StoryObj<typeof meta>

const WTMR_HOLDING = holding(WTMR, units(1_234.5, 1), {transferInVolume: units(1_300, 1), transferOutVolume: units(65.5, 1), transferInCount: 14, transferOutCount: 3})

const TEST = {address: token(2).id, symbol: 'TEST', decimals: 18}
const POOL_HOLDING = holding(pair(10, NUMN, TEST), units(3.5, 18))
const expandPool = async ({canvas, userEvent}: {canvas: ReturnType<typeof within>; userEvent: {click: (el: Element) => Promise<void>}}) => {
    await userEvent.click(canvas.getByRole('button', {name: 'expand'}))
    return (label: string) => canvas.queryByText(label)?.nextElementSibling?.textContent
}

export const Empty: Story = {args: {rows: []}}

// a long name, a balance at the uint256 ceiling, no total supply, no decimals, a pair's share token, no symbol, no name and no transfer in
export const EveryCase: Story = {args: {rows: EVERY_HOLDING}}

// a pair's share token names the two tokens it pools, the plain one beside it shows no badge
export const PairHolding: Story = {
    args: {rows: [WTMR_HOLDING, POOL_HOLDING]},
    play: async ({canvas}) => expect(canvas.getAllByText(/^LP /).map(badge => badge.textContent)).toEqual(['LP NUMN/TEST']),
}

// the panel tallies transfers in and out since genesis
export const ExpandedTransferTally: Story = {
    args: {rows: [WTMR_HOLDING]},
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'expand'}))
        const stat = (label: string) => canvas.getByText(label).nextElementSibling?.textContent
        expect(stat('Transfer-in Count')).toBe('14')
        expect(stat('Transfer-in Volume')).toBe('1,300 wWTMR')
        expect(stat('Transfer-out Count')).toBe('3')
        expect(stat('Transfer-out Volume')).toBe('65.5 wWTMR')
    },
}

// the share tokens held claim that share of each reserve
export const PairUnderlying: Story = {
    args: {rows: [POOL_HOLDING]},
    play: async ctx => {
        const stat = await expandPool(ctx)
        expect(stat('Underlying NUMN')).toBe('≈2.2 NUMN')
        expect(stat('Underlying TEST')).toBe('≈5,517.99 TEST')
    },
}

// mainnet's NUMN/wWTMR pair, a one decimal member and the 1000 share floor the pair locks away
export const PairFewDecimals: Story = {
    args: {rows: [holding(pair(10, NUMN, {address: WTMR.id, symbol: 'wWTMR', decimals: WTMR.decimals}, {totalSupply: '3162277660', reserve0: units(1, 18), reserve1: '10'}), '3162276660')]},
    play: async ctx => {
        const stat = await expandPool(ctx)
        expect(stat('Underlying NUMN')).toBe('≈0.99 NUMN')
        expect(stat('Underlying wWTMR')).toBe('0.9 wWTMR')
    },
}

// a pair that never logged a Sync in the index range has no reserves to split
export const PairNeverSynced: Story = {
    args: {rows: [holding(pair(10, NUMN, TEST, {reserve0: null, reserve1: null}), units(3.5, 18))]},
    play: async ctx => {
        const stat = await expandPool(ctx)
        expect(stat('Underlying NUMN')).toBeUndefined()
        expect(stat('Transfer-in Count')).toBe('1')
    },
}

// a supply that answered nothing leaves no share to work out
export const PairNoSupply: Story = {
    args: {rows: [holding(pair(10, NUMN, TEST, {totalSupply: null}), units(3.5, 18))]},
    play: async ctx => {
        const stat = await expandPool(ctx)
        expect(stat('Underlying NUMN')).toBeUndefined()
        expect(stat('Transfer-in Count')).toBe('1')
    },
}

// no transfer in leaves the first block empty, the balance still shows
export const NoTransferIn: Story = {
    args: {rows: [holding(token(2, {name: null}), units(250_000, 18), {firstInBlock: null})]},
    play: async ({canvas}) => expect(within(canvas.getAllByRole('row')[1]).getByText('—')).toBeVisible(),
}
