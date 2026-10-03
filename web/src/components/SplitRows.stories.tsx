import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {fmtBalance} from '@/lib/format'
import {ss58Encode} from '@/lib/ss58'
import {CHAIN, HOLDING, holdingRows, MAX_U128} from '../../../mock/fixtures/accounts.js'
import {numn, PEOPLE} from '../../../mock/fixtures.js'
import AccountLink from './AccountLink'
import HoldingsList from './HoldingsList'
import {SplitRow, SplitRows} from './SplitRows'

// token icons are keyed by chain id, which only the provider knows
const meta = {title: 'Components/SplitRows'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
    render: () => <HoldingsList rows={[]} />,
}

export const One: Story = {
    render: () => <HoldingsList rows={[HOLDING]} />,
}

export const Many: Story = {
    render: () => <HoldingsList rows={holdingRows(20)} />,
}

export const WiderThanCard: Story = {
    render: () => (
        <div className="max-w-sm">
            <SplitRows>
                {[PEOPLE[7], PEOPLE[8]].map((p, i) => (
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
                        <span className="font-mono">{fmtBalance(i === 0 ? MAX_U128 : numn(12.5), CHAIN.decimals, CHAIN.symbol)}</span>
                    </SplitRow>
                ))}
            </SplitRows>
        </div>
    ),
}
