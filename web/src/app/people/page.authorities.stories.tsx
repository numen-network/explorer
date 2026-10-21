import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {at, HEAD, person} from '../../../../mock/fixtures.js'
import {lastPage, pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {EVERY_AUTHORITY, EVERY_VERDICT, NAMED_OWNER, authority, bare, identities} from './page.stories.helpers'

export default {title: 'Pages/People/Authorities', ...pageMeta(PeoplePage)}

const authoritiesTab = (authorities: object[], page = '1') => identities(EVERY_VERDICT, {authorities, tab: 'authorities', page})

export const Empty = authoritiesTab([])

export const One = authoritiesTab([authority('numen', NAMED_OWNER)])

export const EveryCase: StoryObj = {
    ...authoritiesTab(EVERY_AUTHORITY),
    play: async ({canvas}) => {
        const rows = [...(await canvas.findAllByRole('row'))].slice(1).map(r => [...r.querySelectorAll('td')].map(td => td.textContent))
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
