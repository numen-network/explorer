import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {AccountVoteRow} from '@/lib/gql'
import {voteEntry, type CountedDelegation} from '@/lib/voteEntry'
import {account, HEAD, numn, PEOPLE, person} from '../../../../mock/fixtures.js'
import {CHAIN, SUBJECT, vote, voteRows} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {VotesTable} from './VotesTable'

const meta = {title: 'Components/Account/VotesTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const MORE = `/account/${SUBJECT}?tab=received&rtab=delegators`

const counted = (i: number, conviction: string, units: number): CountedDelegation => ({conviction, balance: numn(units), delegator: {id: person(i).id}})

// the delegators past the named few carry no identity
const unnamed = (i: number, units: number): CountedDelegation => ({conviction: 'Locked1x', balance: numn(units), delegator: {id: account(200 + i)}})

const REFS = new Map(PEOPLE.map(p => [p.id, p]))

// each standard vote's panel, from the delegations its referendum counts through it
const table = (rows: AccountVoteRow[], delegations: Record<number, CountedDelegation[]> = {}) => {
    const details = new Map(rows.filter(v => v.kind === 'Standard').map(v => [v.id, voteEntry(v, {id: SUBJECT}, delegations[v.referendum.index] ?? [], REFS, CHAIN.ss58)]))
    return (
        <Card size="flush">
            <VotesTable rows={rows} details={details} moreHref={MORE} head={HEAD} chain={CHAIN} />
        </Card>
    )
}

const expand = (index: number) => async ({canvasElement, userEvent}: {canvasElement: HTMLElement; userEvent: {click: (el: Element) => Promise<void>}}) => {
    const row = within(canvasElement).getByRole('link', {name: new RegExp(`^#${index}\\b`)}).closest('tr')!
    await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
}

const EVERY_KIND_DELEGATIONS = {6: [counted(1, 'Locked3x', 1_500)], 10: [counted(2, 'Locked2x', 3_000), counted(3, 'Locked4x', 1_500)]}

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table([vote(0)])}

// aye, nay, split and abstain, every conviction, each phase a referendum ends in, one untitled and one removed
export const EveryKind: Story = {
    render: () => table(voteRows(), EVERY_KIND_DELEGATIONS),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Referendum')).toEqual([
            '#6 · Fund the Q4 explorer roadmap',
            '#9 · Referendum 9 title',
            '#10 · Referendum 10 title',
            '#1 · Treasury spend for community events across Asia, Europe and the Americas',
            '#0 · Referendum 0 title',
            '#11 · Referendum 11 title',
            '#2',
            '#3 · Referendum 3 title',
            '#4 · Referendum 4 title',
            '#8 · Referendum 8 titleremoved',
        ])
        expect(columnTexts(canvasElement, 'Status')).toEqual(['Deciding', 'Confirming', 'Approved', 'Rejected', 'Approved', 'Timed out', 'Cancelled', 'Timed out', 'Killed', 'Submitted'])
        expect(columnTexts(canvasElement, 'Vote')).toEqual(['Aye', 'AyeNay', 'Aye', 'Nay', 'Nay', 'AyeNayAbstain', 'Nay', 'Aye', 'Nay', 'Aye'])
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['1x', '0.1x', '3x', '6x', '0.1x', '0.1x', '2x', '4x', '5x', '1x'])
        expect(columnTexts(canvasElement, 'Capital')).toEqual([
            '1,000 NUMN',
            '4,000 NUMN1,500 NUMN',
            '1,500 NUMN',
            '250,000 NUMN',
            '2,000 NUMN',
            '100 NUMN100 NUMN9,800 NUMN',
            '2,500 NUMN',
            '2,750 NUMN',
            '3,000 NUMN',
            '3,250 NUMN',
        ])
        expect(columnTexts(canvasElement, 'Votes')).toEqual([
            '5,500 NUMN1,000 + 4,500 delegated',
            '400 NUMN150 NUMN',
            '16.5K NUMN4,500 + 12K delegated',
            '1.5M NUMN',
            '200 NUMN',
            '10 NUMN10 NUMN980 NUMN',
            '5,000 NUMN',
            '11K NUMN',
            '15K NUMN',
            '3,250 NUMN',
        ])
        // an ongoing vote has no unlock yet, #1's 6x lock runs months past the head, the removed #8 is freed and the rest wait for an unlock
        expect(columnTexts(canvasElement, 'Unlocks')).toEqual([
            '—',
            '—',
            '#940,560 · Unlockable',
            '#2,478,720 · in 5mo 21d',
            '#588,640 · Unlockable',
            '#520,960 · Unlockable',
            '#652,000 · Unlockable',
            '#820,960 · Unlockable',
            '#790,000 · Unlockable',
            '#996,000 · Unlocked',
        ])
    },
}

// only a standard vote opens, a split has no conviction to show and carries no delegations
export const OnlyStandardOpens: Story = {
    render: () => table(voteRows(), EVERY_KIND_DELEGATIONS),
    play: async ({canvasElement}) => {
        const rows = within(canvasElement).getAllByRole('row').slice(1)
        expect(rows.map(r => within(r).queryByRole('button', {name: 'expand'}) != null)).toEqual([true, false, true, true, true, false, true, true, true, true])
    },
}

export const ExpandedWithoutDelegators: Story = {
    render: () => table(voteRows(), EVERY_KIND_DELEGATIONS),
    play: async ctx => {
        await expand(3)(ctx)
        await expect(within(ctx.canvasElement).getByText('Self votes')).toBeInTheDocument()
        expect(within(ctx.canvasElement).queryByText('Delegation list')).toBeNull()
    },
}

// #10 at 3x carries two delegations, 3,000 at 2x and 1,500 at 4x
export const ExpandedWithDelegators: Story = {
    render: () => table(voteRows(), EVERY_KIND_DELEGATIONS),
    play: async ctx => {
        await expand(10)(ctx)
        const list = within(ctx.canvasElement).getByText('Delegation list').parentElement!
        expect(columnTexts(list, 'Capital')).toEqual(['3,000 NUMN 2x', '1,500 NUMN 4x'])
        expect(columnTexts(list, 'Votes')).toEqual(['6,000 NUMN', '6,000 NUMN'])
    },
}

// twelve delegations list the biggest ten, the other two wait on the account's Received tab
export const ExpandedOverInlineLimit: Story = {
    render: () => table([vote(0)], {6: Array.from({length: 12}, (_, i) => unnamed(i, 12_000 - i * 500))}),
    play: async ctx => {
        await expand(6)(ctx)
        const more = within(ctx.canvasElement).getByRole('link', {name: /2 more delegators on the account page/})
        expect(more.getAttribute('href')).toBe(MORE)
    },
}
