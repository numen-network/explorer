import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {CHAIN, MAX_U128, PLANCK} from '../../../mock/fixtures/accounts.js'
import {numn} from '../../../mock/fixtures.js'
import Balance from './Balance'

const meta = {title: 'Components/Balance'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

// where the ink stops is the point
const CASES: [string, string | bigint][] = [
    ['zero', '0'],
    ['one planck', PLANCK],
    ['whole', numn(1_250)],
    ['one decimal', numn(1_250.5)],
    ['two decimals from a bigint', 7n * 10n ** 18n + 120_000_000_000_000_005n],
    ['four decimals', numn(0.1234)],
    ['zero after the first decimal', numn(7.0105)],
    ['ink past the fourth decimal', '1234567890123456789'],
    ['issuance scale', '602518848000000000000000000'],
    ['u128 ceiling', MAX_U128],
]

// a figure wraps the way the balance card wraps it
export const Values: Story = {
    render: () => (
        <div className="grid gap-y-2 font-mono text-sm sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center sm:gap-x-6">
            {CASES.map(([label, planck]) => (
                <div key={label} className="grid sm:contents">
                    <span className="font-sans text-xs text-muted-foreground">{label}</span>
                    <span className="wrap-anywhere">
                        <Balance planck={planck} chain={CHAIN} />
                    </span>
                </div>
            ))}
        </div>
    ),
}
