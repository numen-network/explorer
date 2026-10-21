import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import type {RegistrarRow} from '@/lib/gql'
import {CHAIN, REGISTRARS} from '../../../../mock/fixtures/accounts.js'
import {RegistrarTile} from './Registrar'

const meta = {title: 'Pages/Account/Registrar'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const seat = (index: number, traits: Partial<RegistrarRow> = {}) => ({...(REGISTRARS as RegistrarRow[]).find(r => r.index === index)!, ...traits})

const figure = (root: HTMLElement, label: string) => [...root.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent === label)!.nextElementSibling!.textContent

export const IndexAndFee: Story = {
    render: () => <RegistrarTile r={seat(2)} chain={CHAIN} />,
    play: async ({canvasElement}) => {
        await expect(figure(canvasElement, 'Registrar')).toBe('#2')
        await expect(figure(canvasElement, 'Fee')).toBe('12 NUMN')
    },
}

// a seat from genesis has no block it was added at
export const FromGenesis: Story = {
    render: () => <RegistrarTile r={seat(0)} chain={CHAIN} />,
    play: async ({canvasElement}) => expect(figure(canvasElement, 'Added')).toBe('—'),
}

export const NeverJudged: Story = {
    render: () => <RegistrarTile r={seat(5, {givenCount: 0, lastJudgementBlock: null, lastJudgementAt: null})} chain={CHAIN} />,
    play: async ({canvasElement}) => expect(figure(canvasElement, 'Last judgement')).toBe('—'),
}
