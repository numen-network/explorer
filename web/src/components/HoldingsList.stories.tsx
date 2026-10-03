import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {EVERY_HOLDING, holding, holdings, units, WTMR} from '../../../mock/fixtures/evm.js'
import HoldingsList from './HoldingsList'

const meta = {
    title: 'Components/HoldingsList',
    component: HoldingsList,
} satisfies Meta<typeof HoldingsList>
export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {args: {rows: []}}

export const One: Story = {args: {rows: [holding(WTMR, units(1_234.5, 1))]}}

export const Many: Story = {args: {rows: holdings(20)}}

export const EveryCase: Story = {args: {rows: EVERY_HOLDING}}
