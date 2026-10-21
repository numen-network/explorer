import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {delegatedFrom, delegatedOnTracks, delegatingTo, SUBJECT, TRACKS} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, numn, PEOPLE, person} from '../../../../../mock/fixtures.js'
import {columnTexts, filterOptions} from '../../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, build, story, voting, governanceTabs, summaries} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Received', ...pageMeta(AccountPage), decorators: [wellKnown]}

const tracksTable = (root: HTMLElement) => within(root).getByRole('columnheader', {name: 'Delegators'}).closest('table')!
const rootAndUpgrade = [...delegatedOnTracks(PEOPLE[1], TRACKS.slice(0, 2), numn(1_000)), ...delegatedOnTracks(PEOPLE[2], TRACKS.slice(0, 1), numn(500))]

// two delegators over two tracks, Root carrying 1,500 at 3x for the most on one track
export const Summary: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received'}),
    play: async ({canvasElement}) =>
        expect(summaries(canvasElement)).toEqual([{Tracks: '2', Delegators: '2', Capital: '1,500 NUMN', 'Max delegations': '4,500 NUMN'}]),
}

// one delegator on one track, 5,000 at 3x
export const TracksOne: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(PEOPLE[1], TRACKS.slice(0, 1), numn(5_000))}, {tab: 'received'}),
    play: async ({canvasElement}) => {
        const table = tracksTable(canvasElement)
        expect(columnTexts(table, 'Track')).toEqual(['Root'])
        expect([columnTexts(table, 'Delegators'), columnTexts(table, 'Capital'), columnTexts(table, 'Votes')]).toEqual([['1'], ['5,000 NUMN'], ['15,000 NUMN']])
    },
}

// Root carries both delegators, Runtime Upgrade one, every row linking to its own filter
export const TracksMany: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received'}),
    play: async ({canvasElement}) => {
        const table = tracksTable(canvasElement)
        expect(columnTexts(table, 'Track')).toEqual(['Root', 'Runtime Upgrade'])
        expect([columnTexts(table, 'Delegators'), columnTexts(table, 'Capital'), columnTexts(table, 'Votes')]).toEqual([
            ['2', '1'],
            ['1,500 NUMN', '1,000 NUMN'],
            ['4,500 NUMN', '3,000 NUMN'],
        ])
        const links = within(table).getAllByRole('link')
        const params = links.map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams)
        expect(params.map(q => [q.get('rtab'), q.get('dtrack')])).toEqual([
            ['delegators', TRACKS[0].id],
            ['delegators', TRACKS[1].id],
        ])
    },
}

// Received opens on its tracks, the delegator list a tab away
export const OpensOnTracks: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received'}),
    play: async ({canvasElement}) => {
        const links = within(within(canvasElement).getByRole('navigation', {name: 'Received'})).getAllByRole('link')
        expect(links.map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get('rtab'), a.querySelector('[data-slot=badge]')!.textContent, a.getAttribute('aria-current')])).toEqual([
            ['tracks', '2', 'page'],
            ['delegators', '3', null],
        ])
        expect(within(canvasElement).queryByRole('columnheader', {name: 'Delegated from'})).toBeNull()
    },
}

// the delegator list keeps the summary and leaves the tracks table behind
export const Delegators: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvasElement}) => {
        const links = within(within(canvasElement).getByRole('navigation', {name: 'Received'})).getAllByRole('link')
        expect(links.map(a => a.getAttribute('aria-current'))).toEqual([null, 'page'])
        expect(within(canvasElement).getByRole('columnheader', {name: 'Delegated from'})).toBeInTheDocument()
        expect(within(canvasElement).queryByRole('columnheader', {name: 'Delegators'})).toBeNull()
        expect(summaries(canvasElement)).toHaveLength(1)
    },
}

interface WhoClause {
    id_eq?: string
    OR?: {identityDisplay_containsInsensitive?: string}[]
}

// the delegator list answering the who clause a search sends, an address by id and any other text by display name
const searched = (q: string) =>
    pageStory(
        {
            ...build({delegationsIn: rootAndUpgrade}),
            delegations: ({where}: {where: {who?: WhoClause}}) =>
                rootAndUpgrade.filter(d => {
                    const who = where.who
                    if (who == null) return true
                    if (who.id_eq != null) return d.who.id === who.id_eq
                    return (d.who.identityDisplay ?? '').toLowerCase().includes(who.OR![0].identityDisplay_containsInsensitive!.toLowerCase())
                }),
        },
        {params: {id: SUBJECT}, searchParams: {tab: 'received', rtab: 'delegators', q}}
    )

const delegatorsShown = (root: HTMLElement) => columnTexts(within(root).getByRole('columnheader', {name: 'Delegated from'}).closest('table')!, 'Delegated from')

// a whole address finds the one delegator, its single Root delegation
export const SearchAddress: StoryObj = {
    ...searched(ss58Encode(PEOPLE[2].id, chainInfo.ss58)),
    play: async ({canvasElement}) => {
        expect(within(canvasElement).getByPlaceholderText('Search address or identity')).toHaveValue(ss58Encode(PEOPLE[2].id, chainInfo.ss58))
        expect(delegatorsShown(canvasElement)).toHaveLength(1)
        expect(columnTexts(canvasElement, 'Capital')).toEqual(['500 NUMN'])
    },
}

// any other text matches identity names, Orbit Labs on both its tracks
export const SearchName: StoryObj = {
    ...searched('orbit'),
    play: async ({canvasElement}) => expect(delegatorsShown(canvasElement)).toEqual(['Orbit Labs', 'Orbit Labs']),
}

// a search nobody answers says so rather than showing an empty table
export const SearchNoMatch: StoryObj = {
    ...searched('nobody'),
    play: async ({canvas}) => expect(canvas.getByText('No matching delegations.')).toBeInTheDocument(),
}

// where each sortable heading of the delegator list leads, and which one shows an arrow pointing a way
const sortHeads = (root: HTMLElement) => {
    const head = within(root).getByRole('columnheader', {name: 'Delegated from'}).closest('tr')!
    return Object.fromEntries(
        within(head)
            .getAllByRole('link')
            .map(a => {
                const q = new URL(a.getAttribute('href')!, 'http://x').searchParams
                return [a.textContent, [q.get('sort'), q.get('order'), a.querySelector('.lucide-arrow-down') ? 'down' : a.querySelector('.lucide-arrow-up') ? 'up' : null]]
            })
    )
}

// capital biggest first is the default, the url carries no order and its heading turns it around
export const SortDefault: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvasElement}) =>
        expect(sortHeads(canvasElement)).toEqual({
            Conviction: ['conviction', 'desc', null],
            Capital: ['capital', 'asc', 'down'],
            Votes: ['votes', 'desc', null],
            Since: ['since', 'desc', null],
        }),
}

// votes smallest first reaches the query as votes_ASC, its heading turns it back and capital goes home to the default
export const SortVotesAscending: StoryObj = {
    ...pageStory(
        {
            ...build({delegationsIn: rootAndUpgrade}),
            delegations: ({orderBy}: {orderBy: string[]}) => (orderBy?.[0] === 'votes_ASC' ? [...rootAndUpgrade].reverse() : rootAndUpgrade),
        },
        {params: {id: SUBJECT}, searchParams: {tab: 'received', rtab: 'delegators', sort: 'votes', order: 'asc'}}
    ),
    play: async ({canvasElement}) => {
        expect(sortHeads(canvasElement)).toEqual({
            Conviction: ['conviction', 'desc', null],
            Capital: [null, null, null],
            Votes: ['votes', 'desc', 'up'],
            Since: ['since', 'desc', null],
        })
        expect(columnTexts(within(canvasElement).getByRole('columnheader', {name: 'Delegated from'}).closest('table')!, 'Capital')).toEqual(['500 NUMN', '1,000 NUMN', '1,000 NUMN'])
    },
}

// conviction strongest first reaches the query as the numeric level, so None sits below Locked1x
export const SortConviction: StoryObj = {
    ...pageStory(
        {
            ...build({delegationsIn: rootAndUpgrade}),
            delegations: ({orderBy}: {orderBy: string[]}) => (orderBy?.[0] === 'convictionLevel_DESC' ? [...rootAndUpgrade].reverse() : rootAndUpgrade),
        },
        {params: {id: SUBJECT}, searchParams: {tab: 'received', rtab: 'delegators', sort: 'conviction'}}
    ),
    play: async ({canvasElement}) => {
        expect(sortHeads(canvasElement)).toEqual({
            Conviction: ['conviction', 'asc', 'down'],
            Capital: [null, null, null],
            Votes: ['votes', 'desc', null],
            Since: ['since', 'desc', null],
        })
        expect(columnTexts(within(canvasElement).getByRole('columnheader', {name: 'Delegated from'}).closest('table')!, 'Capital')).toEqual(['500 NUMN', '1,000 NUMN', '1,000 NUMN'])
    },
}

const SPENDERS = TRACKS.filter(t => t.name.endsWith('_spender'))

export const DelegatorsMany = story({delegationsIn: delegatedFrom(20, SPENDERS), counts: {tracks: {30: 18, 31: 15, 32: 12}}}, {tab: 'received', rtab: 'delegators'})

export const TrackFilter = story({delegationsIn: delegatedFrom(20, SPENDERS.slice(0, 1)), counts: {tracks: {30: 26, 31: 15, 32: 12}}}, {tab: 'received', dtrack: '30'})

// a delegations link carrying a Track filter opens Received on that track
export const FromDelegationsLink: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(20, SPENDERS.slice(0, 1)), counts: {tracks: {30: 26, 31: 15, 32: 12}}}, {tab: 'delegations', dtrack: '30'}),
    play: async ({canvas, canvasElement}) => {
        expect(governanceTabs(canvasElement)).toEqual({delegations: false, received: true})
        await expect(canvas.getByText('Delegated from')).toBeInTheDocument()
        expect(within(canvas.getByRole('navigation', {name: 'Received'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Delegators/)
    },
}

// a link to a track nobody delegates on any more picks that track at 0
export const TrackFilterEmpty: StoryObj = {
    ...story({delegationsIn: delegatedFrom(20, SPENDERS), counts: {tracks: {30: 18, 31: 15, 32: 12}}}, {tab: 'received', dtrack: '0'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching delegations.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['All 45', '[Root 0]', 'Runtime Upgrade 0', 'Wish For Change 0', 'Identity Admin 0', 'Referendum Canceller 0', 'Referendum Killer 0', 'Small Spender 18', 'Medium Spender 15', 'Big Spender 12'])
    },
}

// Track options go by track id, two-digit ids after the single digits
export const TrackOptions: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(5)}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvasElement}) =>
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['[All 5]', 'Root 1', 'Runtime Upgrade 1', 'Wish For Change 1', 'Identity Admin 1', 'Referendum Canceller 1', 'Referendum Killer 0', 'Small Spender 0', 'Medium Spender 0', 'Big Spender 0']),
}

const EVERY_TRACK = ['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender', 'Medium Spender', 'Big Spender']

// one account delegating the same balance on every track, its tracks in track order with two-digit ids after the single digits
export const EveryTrack: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(person(1), TRACKS, numn(5_000))}, {tab: 'received'}),
    play: async ({canvasElement}) => expect(columnTexts(tracksTable(canvasElement), 'Track')).toEqual(EVERY_TRACK),
}

// the same delegations listed one row per track, in the same order
export const EveryTrackDelegators: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(person(1), TRACKS, numn(5_000))}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Track')).toEqual(EVERY_TRACK),
}
