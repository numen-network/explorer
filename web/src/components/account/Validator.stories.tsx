import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {CHAIN, validatorRow} from '../../../../mock/fixtures/accounts.js'
import Validator from './Validator'

const meta = {title: 'Components/Account/Validator'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = {render: () => <Validator v={validatorRow()} chain={CHAIN} />}

export const Inactive: Story = {render: () => <Validator v={validatorRow({active: false, lockedAmount: '0', lockExpiry: null, offlineSessions: 0})} chain={CHAIN} />}

// locked but yet to sit in an active set, so there is no last session
export const NeverActive: Story = {
    render: () => <Validator v={validatorRow({active: false, offlineSessions: 0, lastActiveSession: null})} chain={CHAIN} />,
    play: async ({canvas}) => expect(canvas.getByText('Last active session').nextElementSibling!.textContent).toBe('—'),
}

export const KickedOffline: Story = {render: () => <Validator v={validatorRow({active: false, kicked: {__kind: 'Offline'}, offlineSessions: 12})} chain={CHAIN} />}

export const KickedEquivocation: Story = {
    render: () => <Validator v={validatorRow({active: false, kicked: {__kind: 'Equivocation'}, equivocations: 1, lastActiveSession: 2_147_483_647})} chain={CHAIN} />,
}
