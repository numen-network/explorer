import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {CHAIN} from '../../../mock/fixtures/accounts.js'
import {at, HEAD, numn, person} from '../../../mock/fixtures.js'
import {cardsFit, PHONE} from '../../.storybook/fit'
import ActionList, {type ActionActor, type ActionRow} from './actions'

const meta = {title: 'Components/ActionList'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const actor = (i: number): ActionActor => {
    const acc = person(i)
    return {addr: ss58Encode(acc.id, CHAIN.ss58), acc}
}

const base = (i: number, own: string, delegated = '0') => ({
    id: `action-${i}`,
    block: HEAD - 40 * i,
    iso: at(HEAD - 40 * i),
    actor: actor(i),
    amount: String(BigInt(own) + BigInt(delegated)),
    own,
    delegated,
})

// a move in percentage points as the fraction it makes of the whole
const points = (n: number): [bigint, bigint] => [BigInt(Math.round(n * 1e6)), 100_000_000n]

// every action and decision, each impact sign, moves under a hundredth of a
// point, a flat move, a row with no snapshot and lossy amounts
const EVERY_KIND: ActionRow[] = [
    {...base(0, numn(3_200_000)), kind: 'vote', decision: 'aye', impact: {approval: points(1.25), support: points(0.4)}},
    {...base(1, numn(1_234_567.891), numn(500_000)), kind: 'vote', decision: 'nay', impact: {approval: points(-2.1), support: points(0.05)}},
    {...base(2, numn(48_000)), kind: 'vote', decision: 'split', impact: {approval: points(0.001), support: points(-0.004)}},
    {...base(3, numn(9_800)), kind: 'vote', decision: 'abstain'},
    {...base(4, numn(800_000)), kind: 'remove', decision: 'aye', impact: {approval: points(-0.8), support: points(-0.3)}},
    {...base(5, numn(2_000_000), numn(150_000)), kind: 'delegate', by: actor(9), impact: {approval: points(0.5), support: points(0)}},
    {...base(6, numn(2_000_000), '0'), kind: 'undelegate', by: actor(8), impact: {approval: points(-0.5), support: points(-0.02)}},
]

const list = (rows: ActionRow[]) => <ActionList rows={rows} decimals={CHAIN.decimals} symbol={CHAIN.symbol} />

export const Empty: Story = {
    render: () => list([]),
}

export const One: Story = {
    render: () => list(EVERY_KIND.slice(0, 1)),
}

const impacts = (root: HTMLElement) => [...root.querySelectorAll('tbody tr')].map(row => row.lastElementChild!.textContent)

export const EveryKind: Story = {
    render: () => list(EVERY_KIND),
    play: async ({canvasElement}) => {
        await expect(impacts(canvasElement)).toEqual([
            'Approval +1.25%Support +0.40%',
            'Approval −2.10%Support +0.05%',
            'Approval +<0.01%Support −<0.01%',
            '—',
            'Approval −0.80%Support −0.30%',
            'Approval +0.50%Support 0.00%',
            'Approval −0.50%Support −0.02%',
        ])
    },
}

export const EveryKindOnPhone: Story = {
    ...EveryKind,
    globals: PHONE,
    play: cardsFit,
}

export const Many: Story = {
    render: () =>
        list(
            Array.from({length: 40}, (_, i) => {
                const row = EVERY_KIND[i % EVERY_KIND.length]
                return {...row, ...base(i, row.own, row.delegated)}
            })
        ),
}

export const NoMatch: Story = {
    render: () => list(EVERY_KIND),
    play: async ({canvas, userEvent}) => {
        await userEvent.type(canvas.getByPlaceholderText('Search address or identity'), 'nobody by this name')
    },
}
