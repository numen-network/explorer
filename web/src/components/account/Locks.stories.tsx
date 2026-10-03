import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {CHAIN, MAX_U128} from '../../../../mock/fixtures/accounts.js'
import Locks from './Locks'
import type {LockRow} from './shared'

const meta = {title: 'Components/Account/Locks'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const NUMN = 10n ** 18n

// one row per way the Unlocks column reads, a block, a thing that happens, nothing known and a plain reserve
const EVERY_KIND: LockRow[] = [
    {kind: 'Frozen', source: 'Vesting', amount: 400_000n * NUMN, until: 1_400_000, freedBy: 'until the schedule finishes paying out'},
    {kind: 'Frozen', source: 'Validator stake', amount: 100_000_000n * NUMN, until: null, freedBy: 'until the stake lock expires'},
    {kind: 'Frozen', source: 'democrac', amount: BigInt(MAX_U128), until: null},
    {kind: 'Reserved', source: 'Identity deposit', amount: 5_410_000_000_000_000_000n, until: null, freedBy: 'until the identity is cleared'},
    {kind: 'Reserved', source: 'Session hold', amount: NUMN, until: null},
    {kind: 'Reserved', source: 'Unattributed', amount: 1n, until: null, unattributed: true},
]

export const Empty: Story = {render: () => <Locks rows={[]} chain={CHAIN} />}

export const One: Story = {render: () => <Locks rows={EVERY_KIND.slice(0, 1)} chain={CHAIN} />}

export const EveryKind: Story = {render: () => <Locks rows={EVERY_KIND} chain={CHAIN} />}
