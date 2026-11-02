import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {shortAddr} from '@/components/AddressText'
import {ss58Encode} from '@/lib/ss58'
import {delegatedVoteOut, delegationStep, poll, TRACKS} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, HEAD, numn, person} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, summaries} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Delegations', ...pageMeta(AccountPage), decorators: [wellKnown]}

const track = (name: string) => TRACKS.find(t => t.name === name)!
const [ROOT, UPGRADE, WISH, IDENTITY, SMALL, BIG] = ['root', 'runtime_upgrade', 'wish_for_change', 'identity_admin', 'small_spender', 'big_spender'].map(track)
const [POLARIS, ORBIT, PLAIN, NOVA] = [person(0), person(1), person(2), person(5)]

const step = (block: number, target: typeof POLARIS, on: typeof ROOT, conviction: string, units: number, method = 'Delegated') => delegationStep(block, target, on, {method, conviction, balance: numn(units)})

// newest first the way the history lists them. Nova Fund held Big Spender
// and let it go, Polaris Guild held Root once before its standing Root
const STEPS = [
    step(998_000, POLARIS, UPGRADE, 'Locked1x', 2_000.25),
    step(997_000, PLAIN, IDENTITY, 'Locked1x', 500),
    step(995_000, ORBIT, WISH, 'Locked3x', 3_000.5),
    step(994_000, POLARIS, SMALL, 'Locked1x', 2_000.25),
    step(990_000, POLARIS, ROOT, 'None', 1_000),
    step(975_000, POLARIS, ROOT, 'None', 1_000, 'Undelegated'),
    step(970_000, POLARIS, ROOT, 'None', 1_000),
    step(950_000, NOVA, BIG, 'Locked2x', 800, 'Undelegated'),
    step(900_000, NOVA, BIG, 'Locked2x', 800),
]

// each vote casts 15K at block HEAD - 500 * (i + 1) unless given
const cast = (i: number, voter: typeof POLARIS, on: typeof ROOT, aye: boolean, endedAt: number | null = null, submittedAt = 985_000, block?: number) =>
    delegatedVoteOut(i, endedAt == null ? 'Ongoing' : 'Approved', {voter, aye, ...(block != null && {block}), referendum: poll(i, endedAt == null ? 'Ongoing' : 'Approved', endedAt, {track: on, submittedAt})})

// Polaris's Root vote on a referendum over before 990,000 lands in the earlier Root delegation. Orbit's Root vote counts nowhere
const VOTES = [
    cast(0, POLARIS, ROOT, true),
    cast(1, POLARIS, ROOT, false, HEAD - 1_000),
    cast(2, POLARIS, ROOT, true, 980_000, 960_000, 972_000),
    cast(3, POLARIS, UPGRADE, true),
    cast(4, POLARIS, SMALL, true),
    cast(5, POLARIS, SMALL, true),
    cast(6, ORBIT, WISH, false),
    cast(7, ORBIT, WISH, false),
    cast(8, ORBIT, WISH, true),
    cast(9, ORBIT, ROOT, true),
    cast(10, NOVA, BIG, true, 940_000, 910_000, 930_000),
]

// referenda open while each delegation lasted, by the block it began
const OPEN: Record<number, number> = {900_000: 3, 970_000: 2, 990_000: 3, 994_000: 4, 995_000: 4, 997_000: 2, 998_000: 1}

const delegations = (open = OPEN) =>
    story({account: voting(numn(3_000.5)), delegationActions: STEPS, delegatedVotesOut: VOTES, counts: {open: (w: {OR: [unknown, {endedAt_gte: number}]}) => open[w.OR[1].endedAt_gte]}}, {tab: 'delegations'})

// a delegate's standing row comes before its ended one
const delegateRow = (root: HTMLElement, name: string, at = 0) => within(root).getAllByRole('link', {name})[at].closest('tr')!

const expand = (root: HTMLElement, name: string, at = 0) => userEvent.click(within(delegateRow(root, name, at)).getByRole('button', {name: 'expand'}))

const panelOf = (root: HTMLElement) => within(root).getByRole('heading', {name: 'Tracks'}).parentElement!

const PLAIN_NAME = shortAddr(ss58Encode(PLAIN.id, chainInfo.ss58))

// 10 of 19 open referenda voted on. Delegates, Tracks and Delegated count only standing delegations
export const Summary: StoryObj = {
    ...delegations(),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{Delegates: '3', Tracks: '5', Delegated: '3,000.5 NUMN', Participation: '52.63%'}]),
}

// standing rows first, then ended ones, each in the order of its first delegation. Polaris Guild gets one of each
export const ByDelegate: StoryObj = {
    ...delegations(),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Delegate')).toEqual(['Polaris Guild', 'Orbit Labs', PLAIN_NAME, 'Nova Fundended', 'Polaris Guildended'])
        expect(columnTexts(canvasElement, 'Tracks')).toEqual(['3', '1', '1', '1', '1'])
        expect(columnTexts(canvasElement, 'Capital')).toEqual(['2,000.25 NUMN', '3,000.5 NUMN', '500 NUMN', '800 NUMN', '1,000 NUMN'])
        expect(columnTexts(canvasElement, 'Referenda')).toEqual(['5 of 84 aye · 1 nay', '3 of 41 aye · 2 nay', '0 of 2', '1 of 31 aye', '1 of 21 aye'])
        expect(columnTexts(canvasElement, 'Participation')).toEqual(['62.50%', '75.00%', '0.00%', '33.33%', '50.00%'])
        expect(columnTexts(canvasElement, 'Votes cast')).toEqual(['75K NUMN', '45K NUMN', '—', '15K NUMN', '15K NUMN'])
        expect(columnTexts(canvasElement, 'Last vote')).toEqual(['#999,500', '#996,500', '—', '#930,000', '#972,000'])
        expect(columnTexts(canvasElement, 'Since')).toEqual(['#990,000', '#995,000', '#997,000', '#900,000', '#970,000'])
    },
}

// an ended row fades and lists when each of its delegations ended
export const Ended: StoryObj = {
    ...delegations(),
    play: async ({canvasElement}) => {
        expect([0, 1].map(at => delegateRow(canvasElement, 'Polaris Guild', at).classList.contains('opacity-50'))).toEqual([false, true])
        await expand(canvasElement, 'Polaris Guild', 1)
        expect(columnTexts(panelOf(canvasElement), 'Track')).toEqual(['Root'])
        expect(columnTexts(panelOf(canvasElement), 'Until')).toEqual(['#975,000'])
    },
}

// each standing delegation opens under its delegate's row in the order it began
export const Expanded: StoryObj = {
    ...delegations(),
    play: async ({canvasElement}) => {
        await expand(canvasElement, 'Polaris Guild')
        const panel = panelOf(canvasElement)
        expect(columnTexts(panel, 'Track')).toEqual(['Root', 'Small Spender', 'Runtime Upgrade'])
        expect(columnTexts(panel, 'Conviction')).toEqual(['0.1x', '1x', '1x'])
        expect(columnTexts(panel, 'Capital')).toEqual(['1,000 NUMN', '2,000.25 NUMN', '2,000.25 NUMN'])
        expect(columnTexts(panel, 'Votes')).toEqual(['100 NUMN', '2,000.25 NUMN', '2,000.25 NUMN'])
        expect(columnTexts(panel, 'Referenda')).toEqual(['2 of 31 aye · 1 nay', '2 of 42 aye', '1 of 11 aye'])
        expect(columnTexts(panel, 'Participation')).toEqual(['66.66%', '50.00%', '100.00%'])
        expect(columnTexts(panel, 'Votes cast')).toEqual(['30K NUMN', '30K NUMN', '15K NUMN'])
        expect(columnTexts(panel, 'Since')).toEqual(['#990,000', '#994,000', '#998,000'])
        expect(columnTexts(panel, 'Until')).toEqual(['—', '—', '—'])
        expect(within(panel).queryAllByRole('link', {name: /^\d+$/})).toEqual([])
    },
}

// a delegate that cast nothing has no votes to link to, sum or date
export const NothingCast: StoryObj = {
    ...delegations(),
    play: async ({canvasElement}) => {
        expect(within(delegateRow(canvasElement, PLAIN_NAME)).queryByRole('link', {name: '0'})).toBeNull()
        expect(columnTexts(canvasElement, 'Referenda')[2]).toBe('0 of 2')
        expect([columnTexts(canvasElement, 'Votes cast')[2], columnTexts(canvasElement, 'Last vote')[2]]).toEqual(['—', '—'])
    },
}

// no referendum opened on Identity Admin since the account delegated it, so there is no rate to give
export const NothingOpen: StoryObj = {
    ...delegations({...OPEN, 997_000: 0}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Participation')[2]).toBe('—')
        expect(summaries(canvasElement)).toEqual([{Delegates: '3', Tracks: '5', Delegated: '3,000.5 NUMN', Participation: '58.82%'}])
    },
}

// a delegate's vote count opens its votes on the Delegated votes tab
export const ReferendaLink: StoryObj = {
    ...delegations(),
    play: async ({canvasElement}) => {
        const link = within(delegateRow(canvasElement, 'Polaris Guild')).getByRole('link', {name: '5'})
        const url = new URL(link.getAttribute('href')!, 'http://x')
        expect(Object.fromEntries(url.searchParams)).toEqual({tab: 'delegated-votes', delegate: ss58Encode(POLARIS.id, chainInfo.ss58)})
    },
}
