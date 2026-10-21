import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {CHAIN, SUBJECT_EVM} from '../../../mock/fixtures/accounts.js'
import {account, chainInfo, numn} from '../../../mock/fixtures.js'
import {all, cardsFit, expectFits, expectWholeWords} from '../../.storybook/fit'
import AddressText from './AddressText'
import Balance from './Balance'
import CopyBtn from './CopyBtn'
import {DetailCard, DetailRow, JsonBlock, NONE, SELF} from './Detail'

const meta = {title: 'Components/Detail'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const HASH = '0x568b1433558b12a0588b1759578b15c65a8b1a7f598b18ec5c8b1da55b8b1c12'
const ADDRESS = ss58Encode(account(1), chainInfo.ss58)

const ARGS = {
    dest: {__kind: 'Id', value: '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1'},
    value: '1642333333000000000000',
    calls: Array.from({length: 12}, (_, i) => ({__kind: 'Balances', value: {__kind: 'transfer_keep_alive', dest: `0x${String(i).repeat(64).slice(0, 64)}`, value: String(i * 1e18)}})),
}

export const CardWithTitle: Story = {
    render: () => (
        <DetailCard title="Overview">
            <DetailRow label="Block">1,000,000</DetailRow>
            <DetailRow label="Hash">
                {HASH}
                <CopyBtn text={HASH} />
            </DetailRow>
            <DetailRow label="Author">
                <AddressText addr={ADDRESS} full />
                <CopyBtn text={ADDRESS} />
            </DetailRow>
        </DetailCard>
    ),
}

export const CardWithoutTitle: Story = {
    render: () => (
        <DetailCard>
            <DetailRow label="Finalized">Yes</DetailRow>
            <DetailRow label="Spec version">100</DetailRow>
        </DetailCard>
    ),
}

export const NoneAndSelf: Story = {
    render: () => (
        <DetailCard>
            <DetailRow label="Extrinsic">{NONE}</DetailRow>
            <DetailRow label="Beneficiary">{SELF}</DetailRow>
        </DetailCard>
    ),
}

export const LongUnbrokenValue: Story = {
    render: () => (
        <DetailCard>
            <DetailRow label="Logs">{'0x0661757261' + 'ab'.repeat(160)}</DetailRow>
        </DetailCard>
    ),
    play: cardsFit,
}

const LONG_LABEL = 'A label long enough to wrap in its column'

export const LongLabelWraps: Story = {
    render: () => (
        <DetailCard>
            <DetailRow label={LONG_LABEL}>value</DetailRow>
        </DetailCard>
    ),
    play: all(cardsFit, async ({canvas}) => {
        const label = document.createRange()
        label.selectNodeContents(canvas.getByText(LONG_LABEL))
        expect(new Set([...label.getClientRects()].map(r => Math.round(r.top))).size).toBeGreaterThan(1)
    }),
}

const NOTE = 'mapped account of this H160'
const PROSE = "minted reward plus the miner's cut of any fees and tips paid here"

// a card narrower than every value in it, words wrap whole and the address
// breaks where the line runs out
export const WrapsBetweenWords: Story = {
    render: () => (
        <div className="max-w-[480px]">
            <DetailCard>
                <DetailRow label="EVM origin">
                    <span className="text-primary">{SUBJECT_EVM}</span> <span className="ml-1 text-xs text-dim">{NOTE}</span>
                </DetailRow>
                <DetailRow label="Balance">
                    <Balance planck={numn(1_250_005.41)} chain={CHAIN} />
                </DetailRow>
                <DetailRow label="Reward">{PROSE}</DetailRow>
            </DetailCard>
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        expectWholeWords(canvas.getByText(NOTE), canvas.getByText(/NUMN$/), canvas.getByText(PROSE))
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}

export const JsonNull: Story = {
    render: () => (
        <DetailCard>
            <DetailRow label="Args">
                <JsonBlock value={null} />
            </DetailRow>
        </DetailCard>
    ),
}

export const JsonSmall: Story = {
    render: () => (
        <DetailCard>
            <DetailRow label="Args">
                <JsonBlock value={{remark: '0x46756e64206120636f6d6d756e697479207472616e736c6174696f6e20737072696e74'}} />
            </DetailRow>
        </DetailCard>
    ),
}

export const JsonTallScrolls: Story = {
    render: () => (
        <DetailCard>
            <DetailRow label="Args">
                <JsonBlock value={ARGS} />
            </DetailRow>
        </DetailCard>
    ),
}
