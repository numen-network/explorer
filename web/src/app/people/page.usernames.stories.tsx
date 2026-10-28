import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {at, HEAD, person} from '../../../../mock/fixtures.js'
import {filterOptions} from '../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {EVERY_AUTHORITY, EVERY_USERNAME, EVERY_VERDICT, NAMED_OWNER, Username, authority, bare, identities, short, username} from './page.stories.helpers'

export default {title: 'Pages/People/Usernames', ...pageMeta(PeoplePage)}

const usernamesTab = (usernames: object[], {page = '1', q = '', suffix = '', authorities = EVERY_AUTHORITY as object[]} = {}) =>
    identities(EVERY_VERDICT, {usernames: usernames as Username[], authorities, tab: 'usernames', page, q, suffix})

export const Empty = usernamesTab([])

export const One = usernamesTab([username('polaris.numen', NAMED_OWNER)])

// the owner column names the owner by identity or address, never by the username beside it
export const EveryCase: StoryObj = {
    ...usernamesTab(EVERY_USERNAME),
    play: async ({canvas}) => {
        const rows = [...(await canvas.findAllByRole('row'))].slice(1).map(r => [...r.querySelectorAll('td')].map(td => td.textContent))
        expect(rows.map(([name, owner, , status, expires, provider]) => [name, owner, status, expires, provider])).toEqual([
            ['polaris.numenPrimary', 'Polaris Guild', 'Active', '—', 'Allocation'],
            ['polarispool.numen', 'Polaris Guild', 'Active', '—', 'Deposit'],
            ['anon.numenPrimary', short(EVERY_USERNAME[2].owner as {id: string}), 'Active', '—', 'Allocation'],
            ['waiting.numen', short(EVERY_USERNAME[3].owner as {id: string}), 'Pending', `#${(HEAD + 60_000).toLocaleString('en-US')}`, 'Allocation'],
            ['leaving.poolPrimary', short(EVERY_USERNAME[4].owner as {id: string}), 'Unbinding', `#${(HEAD + 250_000).toLocaleString('en-US')}`, 'Deposit'],
            ['legacy.dotPrimary', short(EVERY_USERNAME[5].owner as {id: string}), 'Active', '—', 'System'],
            [`${'w'.repeat(27)}.numenPrimary`, short(EVERY_USERNAME[6].owner as {id: string}), 'Active', '—', 'Allocation'],
        ])
    },
}

const MANY_USERNAMES = Array.from({length: 45}, (_, i) =>
    username(`user${String(i).padStart(2, '0')}.numen`, i % 3 ? bare(300 + i) : person(i), {primary: i % 4 !== 1, grantedBlock: HEAD - 1_000 * (i + 1), grantedAt: at(HEAD - 1_000 * (i + 1))})
)

export const Many = usernamesTab(MANY_USERNAMES)

export const Page2 = usernamesTab(MANY_USERNAMES, {page: '2'})

export const LastPage = usernamesTab(MANY_USERNAMES, {page: lastPage(MANY_USERNAMES.length)})

// every authority's suffix is an option, counting the usernames under it
const SUFFIXED = [...EVERY_USERNAME, username('genesis.genesis', bare(206))]
const SUFFIX_AUTHORITIES = [authority('dot', bare(212)), authority('genesis', bare(210)), authority('numen', NAMED_OWNER), authority('pool', bare(213))]

export const EverySuffix: StoryObj = {
    ...usernamesTab(SUFFIXED, {authorities: SUFFIX_AUTHORITIES}),
    play: async ({canvasElement}) => expect(await filterOptions(canvasElement, 'Authority')).toEqual(['[All 8]', '.dot 1', '.genesis 1', '.numen 5', '.pool 1']),
}

export const BySuffix: StoryObj = {
    ...usernamesTab(SUFFIXED.filter(u => u.suffix === 'pool'), {authorities: SUFFIX_AUTHORITIES, suffix: 'pool'}),
    play: async ({canvasElement}) => expect(within(canvasElement).getByRole('combobox', {name: 'Authority'})).toHaveTextContent('.pool'),
}

// a suffix no authority holds leaves the list on every suffix
export const UnknownSuffix: StoryObj = {
    ...usernamesTab(SUFFIXED, {authorities: SUFFIX_AUTHORITIES, suffix: 'gone'}),
    play: async ({canvasElement}) => expect(within(canvasElement).getByRole('combobox', {name: 'Authority'})).toHaveTextContent('All'),
}

export const Search: StoryObj = {
    ...usernamesTab([username('polaris.numen', NAMED_OWNER)], {q: 'polaris'}),
    play: async ({canvas}) => expect(canvas.getByPlaceholderText('Search username or account')).toHaveValue('polaris'),
}

export const NoMatch: StoryObj = {
    ...usernamesTab([], {q: 'polaris', suffix: 'numen'}),
    play: async ({canvas}) => expect(canvas.getByText('No matching usernames.')).toBeInTheDocument(),
}
