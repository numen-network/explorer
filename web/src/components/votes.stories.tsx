import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {levelLabel} from '@/lib/conviction'
import type {IdentityRef} from '@/lib/identity'
import type {Paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {numn, person} from '../../../mock/fixtures.js'
import {MAX_U128} from '../../../mock/fixtures/accounts.js'
import {anon, CHAIN} from '../../../mock/fixtures/governance.js'
import VoteLists, {type Delegator, type SplitEntry, type VoteEntry, type VoteGroup, type VoteRows} from './votes'

const meta = {title: 'Components/VoteLists'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const weigh = (capital: string, conviction: string) => String(conviction === '0.1x' ? BigInt(capital) / 10n : BigInt(capital) * BigInt(conviction.replace('x', '')))
const addr = (id: string) => ss58Encode(id, CHAIN.ss58)

const delegator = (acc: IdentityRef & {id: string}, conviction: string, capital: number): Delegator => ({addr: addr(acc.id), acc, conviction, capital: numn(capital), votes: weigh(numn(capital), conviction)})

const vote = (i: number, conviction: string, capital: number, delegators: Delegator[] = [], delegatorCount = delegators.length): VoteEntry => {
    const acc = person(i)
    return {
        id: `vote-${i}`,
        addr: addr(acc.id),
        acc,
        conviction,
        capital: numn(capital),
        selfVotes: weigh(numn(capital), conviction),
        delegatorCount,
        delegatedCapital: String(delegators.reduce((n, d) => n + BigInt(d.capital), 0n)),
        delegatedVotes: String(delegators.reduce((n, d) => n + BigInt(d.votes), 0n)),
        delegators,
    }
}

const splitVote = (i: number, ...amounts: number[]): SplitEntry => {
    const acc = person(i)
    return {id: `split-${i}`, addr: addr(acc.id), acc, amounts: amounts.map(numn)}
}

const FIRST: Paging = {page: 1, size: 20, offset: 0}

// totals for Aye, Nay, Abstain and Split, a list without a total has no chip
const groups = (at: string, ...totals: number[]): VoteGroup[] =>
    ['Aye', 'Nay', 'Abstain', 'Split'].slice(0, totals.length).map((label, i) => ({label, total: totals[i], href: `/referendum/12?tab=votes&group=${label.toLowerCase()}`, active: label === at}))

const lists = (chips: VoteGroup[], list: VoteRows, paging = FIRST): Story => ({render: () => <VoteLists groups={chips} list={list} paging={paging} decimals={CHAIN.decimals} symbol={CHAIN.symbol} />})

const standard = (rows: VoteEntry[]): VoteRows => ({kind: 'standard', rows})
const splits = (labels: string[], rows: SplitEntry[]): VoteRows => ({kind: 'split', labels, rows})

const expand = (label: string): Story['play'] => async ({canvas, userEvent}) => {
    const row = (await canvas.findByText(label)).closest('tr')!
    await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
}

const few = [delegator(person(4), '1x', 40_000), delegator(person(5), '0.1x', 25_000), delegator(person(8), '6x', 10_000)]
const many = Array.from({length: 10}, (_, i) => delegator(i === 2 ? person(7) : anon(500 + i), levelLabel((i * 3) % 7), 90_000 - i * 7_000))

const ayes = [vote(3, '0.1x', 500_000), vote(0, '2x', 400_000, many, 13), vote(1, '1x', 300_000, few)]
const every = groups('Aye', 3, 2, 1, 1)

export const NoVotes = lists(groups('Aye', 0, 0, 0), standard([]))

export const OneVote = lists(groups('Aye', 1, 0, 0), standard([vote(0, '3x', 1_000_000)]))

export const EveryGroup = lists(every, standard(ayes))

export const NayGroupSelected = lists(groups('Nay', 3, 2, 1, 1), standard([vote(4, '4x', 300_000), vote(7, '6x', 1_000)]))

export const SplitGroupSelected = lists(groups('Split', 3, 2, 1, 1), splits(['Aye', 'Nay'], [splitVote(6, 100_000, 50_000)]))

export const AbstainGroupSelected = lists(groups('Abstain', 3, 2, 1, 1), splits(['Abstain', 'Aye', 'Nay'], [splitVote(5, 200_000, 20_000, 20_000)]))

export const EmptyGroupSelected = lists(groups('Abstain', 1, 0, 0), splits(['Abstain', 'Aye', 'Nay'], []))

export const MoreThanOnePage = lists(groups('Aye', 250, 0, 0), standard(Array.from({length: 20}, (_, i) => vote(i, `${i % 7}x`, 500_000 - i * 20_000))))

export const ExpandedWithoutDelegators = {...lists(every, standard(ayes)), play: expand('Redshift')}

export const ExpandedWithFewDelegators = {...lists(every, standard(ayes)), play: expand('Orbit Labs')}

// the delegators past the inline ten are counted under the list
const hiddenNote = (note: string): Story['play'] => async context => {
    await expand('Polaris Guild')!(context)
    await expect(context.canvas.getByRole('link', {name: note})).toBeVisible()
}

export const ExpandedOverInlineLimit = {...lists(every, standard(ayes)), play: hiddenNote('3 more delegators on the account page')}

export const ExpandedOneOverInlineLimit = {...lists(every, standard([ayes[0], vote(0, '2x', 400_000, many, 11), ayes[2]])), play: hiddenNote('1 more delegator on the account page')}

export const ExtremeNumbers = lists(
    groups('Aye', 3, 0, 0),
    standard([vote(0, '6x', 1_000_000_000_000, [delegator(anon(1), '6x', 999_999_999_999)]), vote(1, '1x', 0.000_001), vote(2, '0.1x', 0)])
)

export const ExtremeSplitParts = lists(groups('Split', 0, 0, 0, 3), splits(['Aye', 'Nay'], [splitVote(0, 1_000_000_000_000, 999_999_999_999), splitVote(1, 0.000_001, 0), splitVote(2, 0, 0.000_001)]))

// parts that end within two decimals read as they are, a cut part carries ≈
export const TruncationEdges: Story = {
    ...lists(
        groups('Split', 0, 0, 0, 5),
        splits(['Aye', 'Nay'], [splitVote(0, 1.15, 4.35), splitVote(1, 8_200_000, 5_100_000), splitVote(2, 99.999, 9_999.99), splitVote(3, 0.000_001, 0.019), {...splitVote(4), amounts: [MAX_U128, numn(2.01)]}])
    ),
    play: async ({canvas}) => {
        const parts = canvas.getAllByRole('row').slice(1).map(row => [...row.querySelectorAll('td')].slice(1).map(cell => cell.textContent))
        await expect(parts).toEqual([
            ['1.15 NUMN', '4.35 NUMN'],
            ['8.2M NUMN', '5.1M NUMN'],
            ['≈99.99 NUMN', '9,999.99 NUMN'],
            ['≈0 NUMN', '≈0.01 NUMN'],
            ['≈340.28E NUMN', '2.01 NUMN'],
        ])
    },
}
