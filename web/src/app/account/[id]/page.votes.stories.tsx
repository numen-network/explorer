import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {delegatedVote, poll, SUBJECT, vote, voteRows} from '../../../../../mock/fixtures/accounts.js'
import {HEAD, numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {columnTexts, filterChips} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, build, story, voting, summaries} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Votes', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: voting(numn(1_000)), votes: [vote(0)]}, {tab: 'votes'})

const manyVotes = [...voteRows(), ...Array.from({length: 35}, (_, i) => vote(i + 10, {referendum: poll(47 - i, 'Ongoing', null)}))]

export const Many = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes'})

export const Page2 = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes', page: '2'})

export const LastPage = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes', page: lastPage(manyVotes.length)})

// votes cast in one block list the newest referendum first, #10 between #11 and #9
export const InOneBlock: StoryObj = {
    ...story({account: voting(numn(3_000)), votes: [11, 10, 9].map((index, i) => vote(i, {block: HEAD - 500, referendum: poll(index, 'Ongoing', null)}))}, {tab: 'votes'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Referendum').map(t => t!.split(' · ')[0])).toEqual(['#11', '#10', '#9']),
}

// nine standing votes over 14 referenda open since the account showed up, #6 and #9 still deciding and the removed #8 left out, the rate's tip saying which referenda it counts
export const Summary: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), counts: {referenda: 14}}, {tab: 'votes'}),
    play: async ({canvas, canvasElement}) => {
        expect(summaries(canvasElement)).toEqual([{'All votes': '9', Active: '2', 'Participation rate': '64.28%', 'Total locked': '250K NUMN'}])
        await expect(canvas.getByLabelText('Counts only referenda still open after the account first appeared')).toBeInTheDocument()
    },
}

// the delegated votes a referendum counts reach the account's standard vote
// there, and its panel names who delegated
export const Delegated: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), delegatedVotes: [delegatedVote(6, 'Locked3x', 1_500, PEOPLE[1])], refs: [PEOPLE[1]]}, {tab: 'votes'}),
    play: async ({canvasElement, userEvent}) => {
        expect(columnTexts(canvasElement, 'Votes')[0]).toBe('5,500 NUMN1,000 + 4,500 delegated')
        const row = within(canvasElement).getByRole('link', {name: /^#6\b/}).closest('tr')!
        await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
        const list = within(canvasElement).getByText('Delegation list').parentElement!
        expect(columnTexts(list, 'Delegator')).toEqual(['Orbit Labs'])
    },
}

// the type chips count every vote the account cast, removed ones too, and the
// legend under the vote record names each kind of square
export const EveryType: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows()}, {tab: 'votes'}),
    play: async ({canvas, canvasElement}) => {
        expect(filterChips(canvasElement, 'Type')).toEqual(['[All 10]', 'Aye 4', 'Nay 4', 'Split 1', 'Abstain 1'])
        expect(within(canvas.getByRole('list', {name: 'Vote record legend'})).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Aye', 'Nay', 'Split', 'Abstain', 'No vote'])
    },
}

// picking Split asks for split votes only and keeps every chip's count
export const TypeSplit: StoryObj = {
    ...pageStory(
        {...build({account: voting(numn(250_000)), votes: voteRows()}), votes: ({where}: {where: {kind_eq?: string}}) => voteRows().filter(v => v.kind === where.kind_eq)},
        {params: {id: SUBJECT}, searchParams: {tab: 'votes', type: 'split'}}
    ),
    play: async ({canvasElement}) => {
        expect(filterChips(canvasElement, 'Type')).toEqual(['All 10', 'Aye 4', 'Nay 4', '[Split 1]', 'Abstain 1'])
        expect(columnTexts(canvasElement, 'Vote')).toEqual(['AyeNay'])
    },
}

// every vote taken off and no referendum open since, so there is no rate to give
export const SummaryNoOpenReferenda: StoryObj = {
    ...story({account: voting('0'), votes: [vote(0, {removed: true, referendum: poll(6, 'Rejected', HEAD - 100)})], counts: {referenda: 0}}, {tab: 'votes'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{'All votes': '0', Active: '0', 'Participation rate': '—', 'Total locked': '0 NUMN'}]),
}
