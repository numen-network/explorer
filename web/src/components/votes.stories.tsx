import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {within} from 'storybook/test'
import type {IdentityRef} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {person} from '../../../mock/fixtures.js'
import {anon, CHAIN} from '../../../mock/fixtures/governance.js'
import VoteLists, {type Delegator, type VoteEntry, type VoteGroup} from './votes'

const meta = {title: 'Components/VoteLists'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const level = (conviction: string) => Number(conviction.replace('x', ''))
const weigh = (capital: number, conviction: string) => (level(conviction) === 0 ? capital / 10 : capital * level(conviction))
const addr = (id: string) => ss58Encode(id, CHAIN.ss58)

const delegator = (acc: IdentityRef & {id: string}, conviction: string, capital: number): Delegator => ({addr: addr(acc.id), acc, conviction, capital, votes: weigh(capital, conviction)})

const vote = (i: number, conviction: string | null, capital: number, delegators: Delegator[] = [], delegatorCount = delegators.length): VoteEntry => {
    const acc = person(i)
    return {
        id: `vote-${i}`,
        addr: addr(acc.id),
        acc,
        conviction,
        capital,
        selfVotes: conviction ? weigh(capital, conviction) : capital / 10,
        delegatorCount,
        delegatedCapital: delegators.reduce((n, d) => n + d.capital, 0),
        delegatedVotes: delegators.reduce((n, d) => n + d.votes, 0),
        delegators,
    }
}

const lists = (groups: VoteGroup[], partial = false): Story => ({render: () => <VoteLists groups={groups} symbol={CHAIN.symbol} partial={partial} />})

const groups = (aye: VoteEntry[], nay: VoteEntry[] = [], abstain: VoteEntry[] = [], split?: VoteEntry[]): VoteGroup[] => [
    {label: 'Aye', total: aye.length, rows: aye},
    {label: 'Nay', total: nay.length, rows: nay},
    {label: 'Abstain', total: abstain.length, rows: abstain},
    ...(split ? [{label: 'Split', total: split.length, rows: split}] : []),
]

const pick = (label: string): Story['play'] => async ({canvas, userEvent}) => {
    await userEvent.click(await canvas.findByRole('tab', {name: new RegExp(`^${label}`)}))
}

const expand = (label: string): Story['play'] => async ({canvas, userEvent}) => {
    const row = (await canvas.findByText(label)).closest('tr')!
    await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
}

const few = [delegator(person(4), '1x', 40_000), delegator(person(5), '0x', 25_000), delegator(person(8), '6x', 10_000)]
const many = Array.from({length: 10}, (_, i) => delegator(i === 2 ? person(7) : anon(500 + i), `${(i * 3) % 7}x`, 90_000 - i * 7_000))

const every = groups(
    [vote(0, '2x', 400_000, many, 13), vote(1, '1x', 300_000, few), vote(3, '0x', 500_000)],
    [vote(4, '4x', 300_000), vote(7, '6x', 1_000)],
    [vote(5, null, 240_000)],
    [vote(6, null, 150_000)]
)

export const NoVotes = lists(groups([]))

export const OneVote = lists(groups([vote(0, '3x', 1_000_000)]))

export const EveryGroup = lists(every)

export const NayGroupSelected = {...lists(every), play: pick('Nay')}

export const SplitGroupSelected = {...lists(every), play: pick('Split')}

export const EmptyGroupSelected = {...lists(groups([vote(0, '1x', 50_000)])), play: pick('Abstain')}

export const LargestOfMany = lists([
    {label: 'Aye', total: 250, rows: Array.from({length: 5}, (_, i) => vote(i, '1x', 500_000 - i * 50_000))},
    {label: 'Nay', total: 0, rows: []},
    {label: 'Abstain', total: 0, rows: []},
])

export const PartialDelegations = lists(every, true)

export const ExpandedWithoutDelegators = {...lists(every), play: expand('Redshift')}

export const ExpandedWithFewDelegators = {...lists(every), play: expand('Orbit Labs')}

export const ExpandedOverInlineLimit = {...lists(every), play: expand('Polaris Guild')}

export const ExtremeNumbers = lists(groups([vote(0, '6x', 1_000_000_000_000, [delegator(anon(1), '6x', 999_999_999_999)]), vote(1, '0x', 0), vote(2, '1x', 0.000_001)]))
