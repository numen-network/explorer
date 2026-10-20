import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {fmtBalance} from '@/lib/format'
import {ss58Encode} from '@/lib/ss58'
import {CHAIN, MAX_U128} from '../../../mock/fixtures/accounts.js'
import {numn, PEOPLE} from '../../../mock/fixtures.js'
import AccountLink from './AccountLink'
import {SplitRow, SplitRows} from './SplitRows'

const meta = {title: 'Components/SplitRows'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const row = (p: (typeof PEOPLE)[number], amount: string) => (
    <SplitRow
        key={p.id}
        lead={
            <>
                <AccountLink addr={ss58Encode(p.id, CHAIN.ss58)} acc={p} />
                <span className="text-muted-foreground">→</span>
                <AccountLink addr={ss58Encode(PEOPLE[2].id, CHAIN.ss58)} acc={PEOPLE[2]} />
            </>
        }
    >
        <span className="font-mono">{fmtBalance(amount, CHAIN.decimals, CHAIN.symbol)}</span>
    </SplitRow>
)

export const One: Story = {render: () => <SplitRows>{row(PEOPLE[7], numn(12.5))}</SplitRows>}

export const Many: Story = {render: () => <SplitRows>{PEOPLE.slice(0, 8).map((p, i) => row(p, numn(1_000 / (i + 1))))}</SplitRows>}

export const WiderThanCard: Story = {
    render: () => (
        <div className="max-w-sm">
            <SplitRows>{[row(PEOPLE[7], MAX_U128), row(PEOPLE[8], numn(12.5))]}</SplitRows>
        </div>
    ),
}
