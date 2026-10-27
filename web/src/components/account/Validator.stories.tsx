import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {CHAIN, JJFU_OFFLINE, MADE_UP_EQUIVOCATION, validatorRow} from '../../../../mock/fixtures/accounts.js'
import {HEAD} from '../../../../mock/fixtures.js'
import {columnTexts} from '../../../.storybook/fit'
import {ValidatorTile} from './Validator'
import {ValidatorOffencesTable} from './ValidatorOffencesTable'

const meta = {title: 'Pages/Account/Validator | Offences'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const figure = (root: HTMLElement, label: string) => [...root.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent === label)!.nextElementSibling!.textContent

// locked but yet to sit in an active set, so there is no last session
export const TilePending: Story = {
    render: () => <ValidatorTile v={validatorRow({active: false, lastActiveSession: null})} offline={0} equivocations={0} chain={CHAIN} head={HEAD} renewEvery="1d" />,
    play: async ({canvasElement}) => {
        await expect(figure(canvasElement, 'Status')).toBe('Pending')
        await expect(figure(canvasElement, 'Last active session')).toBe('—')
    },
}

// the cooldown ran out but the lock has yet to expire
export const TileKickedEquivocation: Story = {
    render: () => <ValidatorTile v={validatorRow({active: false, status: 'Kicked', kicked: {__kind: 'Equivocation'}, rejoinCooldown: HEAD - 1})} offline={0} equivocations={1} chain={CHAIN} head={HEAD} renewEvery="1d" />,
    play: async ({canvasElement}) => {
        await expect(figure(canvasElement, 'Status')).toBe('Kicked · Equivocation')
        await expect(figure(canvasElement, 'Rejoin after')).toBe('—')
    },
}

export const OffencesOffline: Story = {
    render: () => <ValidatorOffencesTable rows={JJFU_OFFLINE} />,
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Event')).toEqual(['292620-0', '292560-0'])
        await expect(columnTexts(canvasElement, 'Block')).toEqual(['#292,620', '#292,560'])
        await expect(columnTexts(canvasElement, 'Extrinsic')).toEqual(['—', '—'])
    },
}

export const OffencesBothKinds: Story = {
    render: () => <ValidatorOffencesTable rows={[MADE_UP_EQUIVOCATION, ...JJFU_OFFLINE]} />,
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Equivocation', 'Offline', 'Offline'])
        await expect(columnTexts(canvasElement, 'Extrinsic')).toEqual(['293100-2', '—', '—'])
    },
}
