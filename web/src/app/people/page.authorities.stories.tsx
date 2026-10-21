import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {at, HEAD, person} from '../../../../mock/fixtures.js'
import {lastPage, pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {INT_MAX, EVERY_VERDICT, identities, tileText, bare, NAMED_OWNER} from './page.stories.helpers'

export default {title: 'Pages/People/Authorities', ...pageMeta(PeoplePage)}

const authority = (suffix: string, account: object, traits: object = {}) => ({
    id: suffix,
    account,
    allocation: 47,
    usernameCount: 3,
    addedBlock: HEAD - 20_000,
    addedAt: at(HEAD - 20_000),
    ...traits,
})

const authoritiesTab = (authorities: object[], page = '1') => identities(EVERY_VERDICT, {authorities, tab: 'authorities', page})

export const Empty = authoritiesTab([])

export const One = authoritiesTab([authority('numen', NAMED_OWNER)])

// a suffix the chain started with has no AuthorityAdded behind it
export const EveryCase: StoryObj = {
    ...authoritiesTab([
        authority('genesis', bare(210), {addedBlock: null, addedAt: null}),
        authority('numen', NAMED_OWNER),
        authority('spent', bare(211), {allocation: 0, usernameCount: 0}),
        authority('maxed', person(1), {allocation: INT_MAX, usernameCount: INT_MAX}),
    ]),
    play: async ({canvas, canvasElement}) => {
        const rows = [...(await canvas.findAllByRole('row'))].slice(1).map(r => [...r.querySelectorAll('td')].map(td => td.textContent))
        expect(tileText(canvasElement, 'Authorities')).toEqual(['Authorities', '4', '2,147,483,741 · allocation left'])
        expect(rows.map(([, suffix, added, names, left]) => [suffix, added, names, left])).toEqual([
            ['.genesis', '—', '3', '47'],
            ['.numen', expect.stringMatching(/ago/), '3', '47'],
            ['.spent', expect.stringMatching(/ago/), '0', '0'],
            ['.maxed', expect.stringMatching(/ago/), '2,147,483,647', '2,147,483,647'],
        ])
    },
}

const MANY_AUTHORITIES = Array.from({length: 45}, (_, i) => authority(`sfx${String(i).padStart(2, '0')}`, i % 2 ? bare(400 + i) : person(i), {addedBlock: HEAD - 50_000 + i * 100, addedAt: at(HEAD - 50_000 + i * 100)}))

export const Many = authoritiesTab(MANY_AUTHORITIES)

export const Page2 = authoritiesTab(MANY_AUTHORITIES, '2')

export const LastPage = authoritiesTab(MANY_AUTHORITIES, lastPage(MANY_AUTHORITIES.length))
