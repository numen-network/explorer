import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import type {RegistrarRow} from '@/lib/gql'
import {CHAIN, REGISTRARS} from '../../../../mock/fixtures/accounts.js'
import {squidId} from '../../../../mock/fixtures.js'
import {RegistrarTile} from './Registrar'

const meta = {title: 'Pages/Account/Registrar | Current'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const seat = (index: number, traits: Partial<RegistrarRow> = {}) => ({...(REGISTRARS as RegistrarRow[]).find(r => r.index === index)!, ...traits})

const figure = (root: HTMLElement, label: string) => [...root.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent === label)!.nextElementSibling!

const LATEST = squidId(640_100, 1)

export const TileIndexAndFee: Story = {
    render: () => <RegistrarTile r={seat(2)} chain={CHAIN} pending={1} latestExtrinsic={LATEST} />,
    play: async ({canvasElement}) => {
        await expect(figure(canvasElement, 'Registrar').textContent).toBe('#2')
        await expect(figure(canvasElement, 'Fee').textContent).toBe('12 NUMN')
    },
}

export const TilePending: Story = {
    render: () => <RegistrarTile r={seat(2)} chain={CHAIN} pending={1_204} latestExtrinsic={LATEST} />,
    play: async ({canvasElement}) => expect(figure(canvasElement, 'Pending').textContent).toBe('1,204'),
}

export const TileLastJudgementExtrinsic: Story = {
    render: () => <RegistrarTile r={seat(2)} chain={CHAIN} pending={1} latestExtrinsic={LATEST} />,
    play: async ({canvasElement}) => {
        const link = within(figure(canvasElement, 'Last judgement') as HTMLElement).getByRole('link')
        await expect(link.textContent).toBe('640100-1')
        await expect(link.getAttribute('href')).toBe('/extrinsic/640100-1')
    },
}

// a judgement no extrinsic carried leaves only its block to point at
export const TileLastJudgementBlock: Story = {
    render: () => <RegistrarTile r={seat(2)} chain={CHAIN} pending={1} latestExtrinsic={null} />,
    play: async ({canvasElement}) => expect(within(figure(canvasElement, 'Last judgement') as HTMLElement).getByRole('link').getAttribute('href')).toMatch(/^\/block\/\d+$/),
}

// a seat from genesis has no block it was added at
export const TileFromGenesis: Story = {
    render: () => <RegistrarTile r={seat(0)} chain={CHAIN} pending={0} latestExtrinsic={LATEST} />,
    play: async ({canvasElement}) => expect(figure(canvasElement, 'Added').textContent).toBe('—'),
}

export const TileNeverJudged: Story = {
    render: () => <RegistrarTile r={seat(5, {givenCount: 0, lastJudgementBlock: null, lastJudgementAt: null})} chain={CHAIN} pending={0} latestExtrinsic={null} />,
    play: async ({canvasElement}) => expect(figure(canvasElement, 'Last judgement').textContent).toBe('—'),
}
