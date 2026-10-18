import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {CHAIN, MAX_U128} from '../../../../mock/fixtures/accounts.js'
import Locks from './Locks'
import type {LockRow} from './shared'

const meta = {title: 'Components/Account/Locks'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const NUMN = 10n ** 18n

// one row per way the Unlocks column reads, a block, a thing that happens, a refund either way, nothing known and a plain reserve
const EVERY_KIND: LockRow[] = [
    {kind: 'Frozen', source: 'Vesting', amount: 400_000n * NUMN, until: 1_400_000, freedBy: 'until the schedule finishes paying out'},
    {kind: 'Frozen', source: 'Validator stake', amount: 100_000_000n * NUMN, until: null, freedBy: 'until the stake lock expires'},
    {kind: 'Frozen', source: 'democrac', amount: BigInt(MAX_U128), until: null},
    {kind: 'Reserved', source: 'Identity deposit', href: '/account/x?tab=timeline', amount: 5_410_000_000_000_000_000n, until: null, freedBy: 'until the identity is cleared'},
    {kind: 'Reserved', source: 'Referendum #1 decision deposit', href: '/referendum/1', amount: 1_000n * NUMN, until: null, refund: 'now'},
    {kind: 'Reserved', source: 'Referendum #0 submission deposit', href: '/referendum/0', amount: 5n * NUMN, until: null, refund: 'never'},
    {kind: 'Reserved', source: 'Session hold', amount: NUMN, until: null},
    {kind: 'Reserved', source: 'Unattributed', amount: 1n, until: null, unattributed: true},
]

export const Empty: Story = {render: () => <Locks rows={[]} chain={CHAIN} />}

export const One: Story = {render: () => <Locks rows={EVERY_KIND.slice(0, 1)} chain={CHAIN} />}

export const EveryKind: Story = {
    render: () => <Locks rows={EVERY_KIND} chain={CHAIN} />,
    play: async ({canvasElement}) => {
        const canvas = within(canvasElement)
        await expect(canvas.getByRole('link', {name: 'Referendum #0 submission deposit'})).toHaveAttribute('href', '/referendum/0')
        await expect(canvas.queryByRole('link', {name: 'Session hold'})).toBeNull()
        await expect(canvas.getByText('Refundable now')).toBeVisible()
        await expect(canvas.getByText('Never refunded')).toBeVisible()
    },
}
