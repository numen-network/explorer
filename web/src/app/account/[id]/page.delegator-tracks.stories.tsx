import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {delegatedOnTracks, TRACKS} from '../../../../../mock/fixtures/accounts.js'
import {numn, PEOPLE, person} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, summaries} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Delegator tracks', ...pageMeta(AccountPage), decorators: [wellKnown]}

const tracksTable = (root: HTMLElement) => within(root).getByRole('columnheader', {name: 'Delegators'}).closest('table')!
const rootAndUpgrade = [...delegatedOnTracks(PEOPLE[1], TRACKS.slice(0, 2), numn(1_000)), ...delegatedOnTracks(PEOPLE[2], TRACKS.slice(0, 1), numn(500))]

// one delegator on one track, 5,000 at 3x
export const One: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(PEOPLE[1], TRACKS.slice(0, 1), numn(5_000))}, {tab: 'delegator-tracks'}),
    play: async ({canvasElement}) => {
        const table = tracksTable(canvasElement)
        expect(columnTexts(table, 'Track')).toEqual(['Root'])
        expect([columnTexts(table, 'Delegators'), columnTexts(table, 'Capital'), columnTexts(table, 'Votes')]).toEqual([['1'], ['5,000 NUMN'], ['15,000 NUMN']])
    },
}

// Root carrying both delegators and 1,500 at 3x for the most on one track, Runtime Upgrade one, and
// every row linking to its own filter
export const Many: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'delegator-tracks'}),
    play: async ({canvasElement}) => {
        expect(within(canvasElement).queryByRole('columnheader', {name: 'Delegated from'})).toBeNull()
        expect(summaries(canvasElement)).toEqual([{Tracks: '2', Delegators: '2', Capital: '1,500 NUMN', 'Max delegations': '4,500 NUMN'}])
        const table = tracksTable(canvasElement)
        expect(columnTexts(table, 'Track')).toEqual(['Root', 'Runtime Upgrade'])
        expect([columnTexts(table, 'Delegators'), columnTexts(table, 'Capital'), columnTexts(table, 'Votes')]).toEqual([
            ['2', '1'],
            ['1,500 NUMN', '1,000 NUMN'],
            ['4,500 NUMN', '3,000 NUMN'],
        ])
        const links = within(table).getAllByRole('link')
        const params = links.map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams)
        expect(params.map(q => [q.get('tab'), q.get('dtrack')])).toEqual([
            ['delegators', TRACKS[0].id],
            ['delegators', TRACKS[1].id],
        ])
    },
}

const EVERY_TRACK = ['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender', 'Medium Spender', 'Big Spender']

// one account delegating the same balance on every track, its tracks in track order with two-digit ids after the single digits
export const EveryTrack: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(person(1), TRACKS, numn(5_000))}, {tab: 'delegator-tracks'}),
    play: async ({canvasElement}) => expect(columnTexts(tracksTable(canvasElement), 'Track')).toEqual(EVERY_TRACK),
}
