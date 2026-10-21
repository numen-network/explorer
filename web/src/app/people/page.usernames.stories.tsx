import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {at, HEAD, numn, person} from '../../../../mock/fixtures.js'
import {lastPage, pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {U128_MAX, EVERY_VERDICT, Username, identities, tileText, short, bare, NAMED_OWNER} from './page.stories.helpers'

export default {title: 'Pages/People/Usernames', ...pageMeta(PeoplePage)}

const username = (name: string, owner: object, traits: object = {}) => ({
    id: name,
    owner,
    status: 'Active',
    expiresAt: null,
    provider: 'Allocation',
    deposit: null,
    primary: true,
    grantedBlock: HEAD - 1_000,
    grantedAt: at(HEAD - 1_000),
    ...traits,
})

const EVERY_USERNAME = [
    username('polaris.numen', NAMED_OWNER),
    username('polarispool.numen', NAMED_OWNER, {primary: false, provider: 'AuthorityDeposit', deposit: numn(0.32), grantedBlock: HEAD - 2_000, grantedAt: at(HEAD - 2_000)}),
    username('anon.numen', bare(201), {grantedBlock: HEAD - 3_000, grantedAt: at(HEAD - 3_000)}),
    username('waiting.numen', bare(202), {status: 'Pending', expiresAt: HEAD + 60_000, primary: false, grantedBlock: HEAD - 4_000, grantedAt: at(HEAD - 4_000)}),
    username('leaving.pool', bare(203), {status: 'Unbinding', expiresAt: HEAD + 250_000, provider: 'AuthorityDeposit', deposit: U128_MAX, grantedBlock: HEAD - 5_000, grantedAt: at(HEAD - 5_000)}),
    username('legacy.dot', bare(204), {provider: 'System', grantedBlock: HEAD - 6_000, grantedAt: at(HEAD - 6_000)}),
    username(`${'w'.repeat(27)}.numen`, bare(205), {grantedBlock: HEAD - 7_000, grantedAt: at(HEAD - 7_000)}),
]

const usernamesTab = (usernames: object[], page = '1') => identities(EVERY_VERDICT, {usernames: usernames as Username[], tab: 'usernames', page})

export const Empty = usernamesTab([])

export const One = usernamesTab([username('polaris.numen', NAMED_OWNER)])

// the owner column names the owner by identity or address, never by the username beside it, and the tile splits the total by status
export const EveryCase: StoryObj = {
    ...usernamesTab(EVERY_USERNAME),
    play: async ({canvas, canvasElement}) => {
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
        expect(tileText(canvasElement, 'Usernames')).toEqual(['Usernames', '7', '5 · active1 · pending1 · unbinding'])
    },
}

const MANY_USERNAMES = Array.from({length: 45}, (_, i) =>
    username(`user${String(i).padStart(2, '0')}.numen`, i % 3 ? bare(300 + i) : person(i), {primary: i % 4 !== 1, grantedBlock: HEAD - 1_000 * (i + 1), grantedAt: at(HEAD - 1_000 * (i + 1))})
)

export const Many = usernamesTab(MANY_USERNAMES)

export const Page2 = usernamesTab(MANY_USERNAMES, '2')

export const LastPage = usernamesTab(MANY_USERNAMES, lastPage(MANY_USERNAMES.length))
