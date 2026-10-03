import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {CHAIN, MAX_U128, PLANCK} from '../../../mock/fixtures/accounts.js'
import {numn} from '../../../mock/fixtures.js'
import Balance from './Balance'

const meta = {title: 'Components/Balance'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

// where the ink stops is the point, so every case differs in its first four decimals
const CASES: [string, string][] = [
    ['zero', '0'],
    ['one planck', PLANCK],
    ['whole', numn(1_250)],
    ['one decimal', numn(1_250.5)],
    ['four decimals', numn(0.1234)],
    ['zero after the first decimal', numn(7.0105)],
    ['ink past the fourth decimal', '1234567890123456789'],
    ['issuance scale', '602518848000000000000000000'],
    ['u128 ceiling', MAX_U128],
]

export const Values: Story = {
    render: () => (
        <div className="grid grid-cols-[200px_auto] items-center gap-x-6 gap-y-2 font-mono text-sm">
            {CASES.map(([label, planck]) => (
                <div key={label} className="contents">
                    <span className="font-sans text-xs text-muted-foreground">{label}</span>
                    <Balance planck={planck} chain={CHAIN} />
                </div>
            ))}
        </div>
    ),
}

export const BigintInput: Story = {
    render: () => (
        <span className="font-mono text-sm">
            <Balance planck={10n ** 18n + 5n} chain={CHAIN} />
        </span>
    ),
}
