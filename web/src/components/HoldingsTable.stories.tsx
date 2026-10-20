import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {EVERY_HOLDING, holding, holdings, NUMN, pair, token, units, WTMR} from '../../../mock/fixtures/evm.js'
import {Card} from './ui/card'
import HoldingsTable from './HoldingsTable'

const meta = {
    title: 'Components/HoldingsTable',
    component: HoldingsTable,
    decorators: [Story => <Card size="flush">{Story()}</Card>],
} satisfies Meta<typeof HoldingsTable>
export default meta
type Story = StoryObj<typeof meta>

const WTMR_HOLDING = holding(WTMR, units(1_234.5, 1), {transferInVolume: units(1_300, 1), transferOutVolume: units(65.5, 1), transferInCount: 14, transferOutCount: 3})

export const Empty: Story = {args: {rows: []}}

export const One: Story = {args: {rows: [WTMR_HOLDING]}}

export const Many: Story = {args: {rows: holdings(20)}}

// a long name, a balance at the uint256 ceiling, no decimals, no symbol, no name and no transfer in
export const EveryCase: Story = {args: {rows: EVERY_HOLDING}}

// a pair's share token names the two tokens it pools, the plain one beside it shows no badge
export const PairHolding: Story = {
    args: {rows: [WTMR_HOLDING, holding(pair(10, NUMN, {address: token(2).id, symbol: 'TEST'}), units(3.5, 18))]},
    play: async ({canvas}) => expect(canvas.getAllByText(/^LP /).map(badge => badge.textContent)).toEqual(['LP NUMN/TEST']),
}

// the panel tallies transfers in and out since genesis
export const Expanded: Story = {
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

// no transfer in leaves the first block empty, the balance still shows
export const NoTransferIn: Story = {
    args: {rows: [holding(token(2, {name: null}), units(250_000, 18), {firstInBlock: null})]},
    play: async ({canvas}) => expect(within(canvas.getAllByRole('row')[1]).getByText('—')).toBeVisible(),
}
