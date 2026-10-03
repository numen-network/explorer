import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {within} from 'storybook/test'
import type {IdentityRef} from '@/lib/identity'
import type {Paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {person} from '../../../mock/fixtures.js'
import {anon, CHAIN} from '../../../mock/fixtures/governance.js'
import VoteLists, {type Delegator, type SplitEntry, type VoteEntry, type VoteGroup, type VoteRows} from './votes'

const meta = {title: 'Components/VoteLists'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const level = (conviction: string) => Number(conviction.replace('x', ''))
const weigh = (capital: number, conviction: string) => (level(conviction) === 0 ? capital / 10 : capital * level(conviction))
const addr = (id: string) => ss58Encode(id, CHAIN.ss58)

const delegator = (acc: IdentityRef & {id: string}, conviction: string, capital: number): Delegator => ({addr: addr(acc.id), acc, conviction, capital, votes: weigh(capital, conviction)})

const vote = (i: number, conviction: string, capital: number, delegators: Delegator[] = [], delegatorCount = delegators.length): VoteEntry => {
    const acc = person(i)
    return {
        id: `vote-${i}`,
        addr: addr(acc.id),
        acc,
        conviction,
        capital,
        selfVotes: weigh(capital, conviction),
        delegatorCount,
        delegatedCapital: delegators.reduce((n, d) => n + d.capital, 0),
        delegatedVotes: delegators.reduce((n, d) => n + d.votes, 0),
        delegators,
    }
}

const splitVote = (i: number, ...amounts: number[]): SplitEntry => {
    const acc = person(i)
    return {id: `split-${i}`, addr: addr(acc.id), acc, amounts}
}

const FIRST: Paging = {page: 1, size: 20, offset: 0}

// totals for Aye, Nay, Abstain and Split, a list without a total has no chip
const groups = (at: string, ...totals: number[]): VoteGroup[] =>
    ['Aye', 'Nay', 'Abstain', 'Split'].slice(0, totals.length).map((label, i) => ({label, total: totals[i], href: `/referendum/12?tab=votes&group=${label.toLowerCase()}`, active: label === at}))

const lists = (chips: VoteGroup[], list: VoteRows, paging = FIRST): Story => ({render: () => <VoteLists groups={chips} list={list} paging={paging} symbol={CHAIN.symbol} />})

const standard = (rows: VoteEntry[], partial = false): VoteRows => ({kind: 'standard', rows, partial})
const splits = (labels: string[], rows: SplitEntry[]): VoteRows => ({kind: 'split', labels, rows})

const expand = (label: string): Story['play'] => async ({canvas, userEvent}) => {
    const row = (await canvas.findByText(label)).closest('tr')!
    await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
}

const few = [delegator(person(4), '1x', 40_000), delegator(person(5), '0x', 25_000), delegator(person(8), '6x', 10_000)]
const many = Array.from({length: 10}, (_, i) => delegator(i === 2 ? person(7) : anon(500 + i), `${(i * 3) % 7}x`, 90_000 - i * 7_000))

const ayes = [vote(3, '0x', 500_000), vote(0, '2x', 400_000, many, 13), vote(1, '1x', 300_000, few)]
const every = groups('Aye', 3, 2, 1, 1)

export const NoVotes = lists(groups('Aye', 0, 0, 0), standard([]))

export const OneVote = lists(groups('Aye', 1, 0, 0), standard([vote(0, '3x', 1_000_000)]))

export const EveryGroup = lists(every, standard(ayes))

export const NayGroupSelected = lists(groups('Nay', 3, 2, 1, 1), standard([vote(4, '4x', 300_000), vote(7, '6x', 1_000)]))

export const SplitGroupSelected = lists(groups('Split', 3, 2, 1, 1), splits(['Aye', 'Nay'], [splitVote(6, 100_000, 50_000)]))

export const AbstainGroupSelected = lists(groups('Abstain', 3, 2, 1, 1), splits(['Abstain', 'Aye', 'Nay'], [splitVote(5, 200_000, 20_000, 20_000)]))

export const EmptyGroupSelected = lists(groups('Abstain', 1, 0, 0), splits(['Abstain', 'Aye', 'Nay'], []))

export const MoreThanOnePage = lists(groups('Aye', 250, 0, 0), standard(Array.from({length: 20}, (_, i) => vote(i, `${i % 7}x`, 500_000 - i * 20_000))))

export const PartialDelegations = lists(every, standard(ayes, true))

export const ExpandedWithoutDelegators = {...lists(every, standard(ayes)), play: expand('Redshift')}

export const ExpandedWithFewDelegators = {...lists(every, standard(ayes)), play: expand('Orbit Labs')}

export const ExpandedOverInlineLimit = {...lists(every, standard(ayes)), play: expand('Polaris Guild')}

export const ExtremeNumbers = lists(
    groups('Aye', 3, 0, 0),
    standard([vote(0, '6x', 1_000_000_000_000, [delegator(anon(1), '6x', 999_999_999_999)]), vote(1, '1x', 0.000_001), vote(2, '0x', 0)])
)

export const ExtremeSplitParts = lists(groups('Split', 0, 0, 0, 3), splits(['Aye', 'Nay'], [splitVote(0, 1_000_000_000_000, 999_999_999_999), splitVote(1, 0.000_001, 0), splitVote(2, 0, 0.000_001)]))
